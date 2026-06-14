#!/usr/bin/env python3
"""
LW D1 IMPORTER
==============
Prend le JSON exporté par window._lwExportForD1() et génère le SQL
pour mettre à jour la DB D1 avec la vraie structure des cours.

Usage:
  python3 lw_d1_importer.py <json_file>
  
  Ou avec stdin:
  cat lw_export.json | python3 lw_d1_importer.py

Le JSON doit avoir la structure:
{
  "courses": [{
    "id": "...",
    "title": "...",
    "sections": [{
      "id": "...",
      "title": "...",
      "lessons": [{
        "id": "...",
        "title": "...",
        "videoUrl": "...",
        "videoType": "...",
        "durationSeconds": 123,
        "durationFormatted": "2:03"
      }]
    }]
  }]
}
"""

import json
import sys
import uuid
import os
import subprocess
from pathlib import Path

def esc(s):
    """Escape SQL single quotes"""
    if not s:
        return ''
    return str(s).replace("'", "''").replace('\n', ' ').strip()

def detect_video_type(url):
    if not url:
        return 'learnworlds'
    url_lower = url.lower()
    if 'youtube.com' in url_lower or 'youtu.be' in url_lower:
        return 'youtube'
    elif 'vimeo.com' in url_lower:
        return 'vimeo'
    elif 'wistia' in url_lower:
        return 'wistia'
    return 'learnworlds'

def parse_duration(formatted):
    """Parse mm:ss or hh:mm:ss to seconds"""
    if not formatted:
        return 0
    parts = formatted.strip().split(':')
    try:
        if len(parts) == 3:
            return int(parts[0])*3600 + int(parts[1])*60 + int(parts[2])
        elif len(parts) == 2:
            return int(parts[0])*60 + int(parts[1])
    except:
        pass
    return 0

def generate_sql(data):
    courses = data.get('courses', [])
    
    sql_lines = [
        f"-- LearnWorlds Real Structure Import",
        f"-- Exporté le: {data.get('exportedAt', 'unknown')}",
        f"-- {len(courses)} cours, {data.get('totalLessons', '?')} leçons",
        "",
        "BEGIN TRANSACTION;",
        "",
        "-- Suppression des anciennes leçons et modules",
        "DELETE FROM campus_lessons;",
        "DELETE FROM campus_modules;",
        ""
    ]
    
    total_lessons = 0
    total_modules = 0
    skipped_courses = []
    
    for course in courses:
        course_id = course.get('id', '')
        course_title = course.get('title', 'Unknown')
        sections = course.get('sections', [])
        
        if not course_id:
            print(f"⚠️  Cours sans ID ignoré: {course_title}", file=sys.stderr)
            skipped_courses.append(course_title)
            continue
        
        sql_lines.append(f"-- === Cours: {course_title} ===")
        
        course_total_lessons = 0
        course_total_duration = 0
        
        for s_idx, section in enumerate(sections):
            section_id = section.get('id') or str(uuid.uuid4())
            section_title = section.get('title', f'Section {s_idx+1}')
            lessons = section.get('lessons', [])
            
            # Insérer le module
            sql_lines.append(
                f"INSERT INTO campus_modules (id, course_id, title, description, display_order, is_active) "
                f"VALUES ('{esc(section_id)}', '{esc(course_id)}', '{esc(section_title)}', '', {s_idx+1}, 1);"
            )
            total_modules += 1
            
            for l_idx, lesson in enumerate(lessons):
                lesson_id = lesson.get('id') or str(uuid.uuid4())
                lesson_title = lesson.get('title', f'Leçon {l_idx+1}')
                video_url = lesson.get('videoUrl', '')
                video_type = lesson.get('videoType') or detect_video_type(video_url)
                duration_sec = lesson.get('durationSeconds', 0)
                
                # Si pas de duration en secondes, essayer le format
                if not duration_sec:
                    duration_sec = parse_duration(lesson.get('durationFormatted', ''))
                
                is_free = 1 if l_idx == 0 else 0  # Première leçon gratuite
                
                sql_lines.append(
                    f"INSERT INTO campus_lessons (id, module_id, course_id, title, video_url, video_type, "
                    f"duration_seconds, display_order, is_active, is_free) "
                    f"VALUES ('{esc(lesson_id)}', '{esc(section_id)}', '{esc(course_id)}', '{esc(lesson_title)}', "
                    f"'{esc(video_url)}', '{video_type}', {duration_sec}, {l_idx+1}, 1, {is_free});"
                )
                
                total_lessons += 1
                course_total_lessons += 1
                course_total_duration += duration_sec
        
        # Mettre à jour le cours avec le vrai nombre de leçons et durée
        total_duration_minutes = round(course_total_duration / 60)
        sql_lines.append(
            f"UPDATE campus_courses SET "
            f"total_lessons = {course_total_lessons}, "
            f"total_duration_minutes = {total_duration_minutes} "
            f"WHERE id = '{esc(course_id)}';"
        )
        sql_lines.append("")
    
    sql_lines.extend([
        "COMMIT;",
        "",
        f"-- Vérification finale",
        f"SELECT 'modules' as table_name, COUNT(*) as count FROM campus_modules",
        f"UNION ALL SELECT 'lessons', COUNT(*) FROM campus_lessons",
        f"UNION ALL SELECT 'courses_updated', COUNT(*) FROM campus_courses WHERE total_lessons > 0;",
    ])
    
    print(f"\n📊 Résumé de la génération SQL:", file=sys.stderr)
    print(f"   ✅ {len(courses) - len(skipped_courses)} cours traités", file=sys.stderr)
    print(f"   ✅ {total_modules} modules générés", file=sys.stderr)
    print(f"   ✅ {total_lessons} leçons générées", file=sys.stderr)
    if skipped_courses:
        print(f"   ⚠️  {len(skipped_courses)} cours ignorés: {skipped_courses}", file=sys.stderr)
    
    return '\n'.join(sql_lines)

def main():
    # Lire le JSON
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
        if not os.path.exists(json_file):
            print(f"❌ Fichier non trouvé: {json_file}", file=sys.stderr)
            sys.exit(1)
        with open(json_file) as f:
            data = json.load(f)
    else:
        print("📥 Lecture depuis stdin... (Ctrl+D pour terminer)", file=sys.stderr)
        data = json.load(sys.stdin)
    
    print(f"📦 Données chargées: {len(data.get('courses', []))} cours", file=sys.stderr)
    
    # Générer le SQL
    sql = generate_sql(data)
    
    # Sauvegarder le SQL
    output_file = '/tmp/lw_real_structure.sql'
    with open(output_file, 'w') as f:
        f.write(sql)
    
    print(f"\n✅ SQL généré: {output_file}", file=sys.stderr)
    print(f"   Taille: {len(sql):,} caractères", file=sys.stderr)
    
    # Option: importer directement
    print(f"\n📋 Pour importer en LOCAL:", file=sys.stderr)
    print(f"   cd /home/user/webapp && npx wrangler d1 execute leader-network-production --local --file={output_file}", file=sys.stderr)
    print(f"\n📋 Pour importer en PRODUCTION:", file=sys.stderr)
    print(f"   cd /home/user/webapp && npx wrangler d1 execute leader-network-production --file={output_file}", file=sys.stderr)
    
    return output_file

if __name__ == '__main__':
    main()

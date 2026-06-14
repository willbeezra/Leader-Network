#!/usr/bin/env python3
"""
Génère le SQL pour mettre à jour les titres anglais → français
directement en DB (campus_lessons + campus_courses).
Stratégie : FR est la langue de la DB. EN/ES/PT/DE via i18n.
"""
import json, os

# ─── Leçons : titre EN en DB → titre FR à écrire ─────────────────────────────
LESSONS = {
    # ID leçon : (titre_en_db, titre_fr)
    'c65874d8-7fc4-400b-b707-2d4a7cde4c8e': ('Habit 1 - Be Proactive', 'Habitude 1 - Être Proactif'),
    'cf864c02-9206-4a3b-ad2d-cc4ba2aa3556': ('Habit 2 - Begin with the end in mind', 'Habitude 2 - Commencer en ayant la fin en tête'),
    'cac2d9ce-7585-4f03-a76c-1bf96e709734': ('Habit 3 - Put first things first', 'Habitude 3 - Donner la priorité aux priorités'),
    '95d85aa1-6cf5-4b78-b1b2-4eac3ac0baf6': ('Habit 4 - Think win win', 'Habitude 4 - Penser gagnant-gagnant'),
    '784ff3b9-2a96-4d83-bfba-fdce001ddab7': ('Habit 5 - Seek first to understand, then to be understood', 'Habitude 5 - Chercher d\'abord à comprendre, puis à être compris'),
    'f343d060-a25f-4b3b-bea7-d154702e234e': ('Habit 6 - Synergize', 'Habitude 6 - Créer des synergies'),
    '5d5b2d4b-14a7-4774-b41c-04ef9cfb0683': ('Habit 7 - Sharpen the saw', 'Habitude 7 - Aiguiser la scie'),
    '499fe4db-e9df-40a6-8a92-bc387114457a': ('How to Develop a Trader Mindset Part 1', 'Développer l\'état d\'esprit du trader - Partie 1'),
    'd5b5e3de-b25a-4c7a-bc28-07cd712bca2e': ('How to Develop a Trader Mindset Part 2', 'Développer l\'état d\'esprit du trader - Partie 2'),
    '2952ea7c-4e1c-4f41-96c2-9c1fb183f9db': ('How to Develop a Trader Mindset Part 3', 'Développer l\'état d\'esprit du trader - Partie 3'),
    '6dbba749-f818-4a90-bee4-4e0aab8ba571': ('How to Develop a Trader Mindset Part 4', 'Développer l\'état d\'esprit du trader - Partie 4'),
    '041881dd-6e59-4dba-98a2-e9c3cc8d5296': ('How to Develop a Trader Mindset Part 5', 'Développer l\'état d\'esprit du trader - Partie 5'),
    'a0e1c641-58b8-49ee-af52-a906564401f1': ('How to build a business that works', 'Comment construire une entreprise qui fonctionne'),
    'dee0e999-cb76-4adb-8a8d-0a8a27f22348': ('How to get your ideas to spread', 'Comment faire propager vos idées'),
    'ff955f98-1226-40da-b492-d369929a687f': ('How to start a Startup- Lecture 1', 'Comment créer une Startup - Cours 1'),
    '94645702-957a-4201-8ae6-bfb0497ec470': ('2. Team and Execution - Lecture 2', '2. Équipe et Exécution - Cours 2'),
    '1f347796-866e-4aa6-a2a4-dd964b8bb5f5': ('3. Before the startup - Lecture 3', '3. Avant la Startup - Cours 3'),
    '9c47e995-332e-4107-901d-38a230a28ae8': ('4. Building Product, Talking to users and Growing - Lecture 4', '4. Construire le Produit, Écouter les Utilisateurs et Grandir - Cours 4'),
    '5aa3cc3c-b643-4174-bc83-e8d9abf78a85': ('5. Competion is for losers Peter Thiel - Lecture 5', '5. La Concurrence c\'est pour les Perdants - Peter Thiel - Cours 5'),
    '734ff9d6-5a68-4d09-93f6-fb391f2d404b': ('How to train your mind to get what you desire', 'Comment entraîner votre esprit pour obtenir ce que vous désirez'),
    'a32d9370-c6ad-48b3-bc7b-1fa9c9cb69e1': ("If you don't understand people, you don't understand business", 'Si vous ne comprenez pas les gens, vous ne comprenez pas les affaires'),
    '5fa76073-cb35-4ce9-be75-f6a234534b9d': ('Introduction to the 5 levels of Leadership', 'Introduction aux 5 niveaux de Leadership'),
    '3657ecd7-d0c6-40b5-b001-da571a8c3ae8': ('Invest in yourself, nurture your body and mind', 'Investissez en vous-même, nourrissez votre corps et votre esprit'),
    '41d346ad-9fea-4599-9c17-ae3ec03343b6': ('Keys to becoming a leader', 'Les clés pour devenir un leader'),
    '18b498d8-4416-4b9a-8250-94477abc04cc': ('Law of Attraction', 'Loi de l\'Attraction'),
    '7b81b6c1-6e29-4052-b19a-c534f5ab5b68': ('Les Brown Tells Emotional Stories That Will Leave You in Tears', 'Les Brown - Histoires Émouvantes qui vous Feront Pleurer'),
    '6c6e2555-6f1b-42e0-a416-4e8258a17c3f': ('Level 1 - The position level', 'Niveau 1 - Le niveau de la position'),
    '408f6861-a8f5-4583-bf7c-61dfe4a9e34b': ('Level 2 - The permission level', 'Niveau 2 - Le niveau de la permission'),
    'f27730df-bbf7-4af9-8505-deeabc6955a8': ('Level 3 - The production level', 'Niveau 3 - Le niveau de la production'),
    '8fc26ff0-e541-4fb0-b66f-a49515a133f1': ('Level 4 - The people development level', 'Niveau 4 - Le niveau du développement des personnes'),
    'f9224e28-b382-46a2-ae0f-7e57604feecb': ('Level 5 - The pinnacle level', 'Niveau 5 - Le niveau du sommet'),
    'd116beaa-669d-4cd5-bb68-7d8176357728': ('Secrets of self made millionaires', 'Les secrets des millionnaires autodidactes'),
    '383906bf-143c-488c-90d2-4421f2cd43da': ('The Forth C - Constraints', 'Le 4ème C - Les Contraintes'),
    'fd5ac081-3adb-4bed-98d6-1c68605b6487': ("The Last Three C's - Continuous Learning, Commitment and Courage", 'Les 3 derniers C - Apprentissage Continu, Engagement et Courage'),
    'e01caaff-1519-4366-9883-766435371bb2': ('The Most Eye Opening 70 Minutes of Your life', 'Les 70 minutes les plus révélatrices de votre vie'),
    '2bea6657-f751-40ec-8ab1-33aa8c7c927c': ('The Second C - Competence', 'Le 2ème C - La Compétence'),
    '0a48dd97-c7d9-478a-95ed-8095b1b51f88': ('The Third C - Concentration', 'Le 3ème C - La Concentration'),
    '59744d03-372c-4b0e-832f-20b1da90a00d': ('The first C - Clarity', 'Le 1er C - La Clarté'),
    '61712c6e-7c39-4c9f-8de4-6b48e23d60e7': ('Together is better', 'Ensemble c\'est mieux'),
    '5a347de8-dc70-4d51-9d9d-157722e28804': ('You were born Rich Part 6', 'Vous êtes né riche - Partie 6'),
    '3cac13bb-7a0a-4d3a-a70d-b5c24104655d': ('You were born rich part 1', 'Vous êtes né riche - Partie 1'),
    'dd92165c-97c8-4fa9-adcf-dad75c32a9ec': ('You were born rich part 2', 'Vous êtes né riche - Partie 2'),
    'a7c01899-f0be-4123-96ad-27fd8381ea84': ('You were born rich part 3', 'Vous êtes né riche - Partie 3'),
    '0ce530a1-df56-4004-9474-6876ab0ce957': ('You were born rich part 4', 'Vous êtes né riche - Partie 4'),
    '506f3aba-8c46-461e-b6f0-d1f35db7d6b8': ('You were born rich part 5', 'Vous êtes né riche - Partie 5'),
    # MT4 (mal orthographiées)
    'aabff860-8a54-4295-b40f-89b93e55c5df': ('5. APPRENDRE A UTILISER METATRADER 4 MT4', '5. Apprendre à utiliser MetaTrader 4 (MT4)'),
    'd654de18-a52f-4613-9654-41f5d8612efb': ('7. JOUTER DES INDICATEURS DANS METATRADER 4 MT4', '7. Ajouter des indicateurs dans MetaTrader 4 (MT4)'),
    '6e45c6ca-e645-4dc8-a081-d9cdbdd2b536': ('8. CREER UN TEMPLATE DANS METATRADER 4', '8. Créer un template dans MetaTrader 4'),
    # Modules leçons
    'b46f3924-c2e8-4246-9fab-0b8cba5da6c2': ('Eleven Universal Law', 'Les Onze Lois Universelles'),
    'd007e431-25af-4f4d-b2a8-8a2356cb3328': ('Why Leaders eat last', 'Pourquoi les Leaders mangent en dernier'),
    '6f7c4433-1791-423f-a576-9e8de2a59d51': ('Vision make a difference', 'La Vision : Faites la Différence'),
}

# ─── Cours : titre anglais/mixte en DB → titre FR ────────────────────────────
COURSES = {
    '9a8b26cb-f352-4d6f-a0c9-0154bed54ebe': ('7 Habits of highly effective people by Stephen Covey', '7 Habitudes des Personnes Hautement Efficaces - Stephen Covey'),
    '90751a63-2e91-4f75-8cf2-6ab48eee5d25': ('Bob Proctor - Eleven Universal Law', 'Bob Proctor - Les Onze Lois Universelles'),
    'add8a43f-4842-4830-97b0-4b9b32e6274b': ('Bob Proctor - Law Of Attraction', "Bob Proctor - La Loi de l'Attraction"),
    '67844531-f60d-47d7-8444-c994be8db017': ('Bob Proctor - You were born rich', 'Bob Proctor - Vous êtes né riche'),
    '489b2131-c2aa-4831-ab9b-035d5cc45e24': ('Entreprise - HOW TO GET YOUR IDEAS TO SPREAD BY SETH GODIN', 'Entreprise - Comment faire propager vos idées - Seth Godin'),
    '7eea2fa3-7c12-498b-8e83-bebb27bf5024': ('Entreprise - How to build a business that works By Brian Tracy', 'Entreprise - Comment construire une entreprise qui fonctionne - Brian Tracy'),
    '2bc7e714-43fc-46e3-841f-a7582fdddac6': ('Entreprise - How to start a Startup', 'Entreprise - Comment créer une Startup'),
    '3706f09f-842b-4689-b556-911844e96317': ('Entreprise - SECRETS OF SELF-MADE MILLIONAIRES BY BRIAN TRACY', 'Entreprise - Secrets des Millionnaires Autodidactes - Brian Tracy'),
    'bf381fdf-6487-4a42-8601-8ca8470ac4a5': ("Entreprise - Simon Sinek If you dont understand people, you dont understand business", 'Entreprise - Si vous ne comprenez pas les gens, vous ne comprenez pas les affaires - Simon Sinek'),
    'e291bd6d-fe5f-46af-a675-4bda26b9af10': ('Entreprise - The Most Eye Opening 70 Minutes of Your life Warren Buffets', 'Entreprise - Les 70 minutes les plus révélatrices de votre vie - Warren Buffett'),
    '6b34fa93-bba0-4f30-a8a5-a7b88bf89173': ('Finance - How to Develop a Trader Mindset', "Finance - Comment Développer l'État d'Esprit du Trader"),
    '7673d739-dbf9-4c9e-8829-bab5a393c2aa': ('Leadership - Keys to becoming a Leader by Dr Myles Munroe', 'Leadership - Les Clés pour Devenir un Leader - Dr Myles Munroe'),
    '2e609c3b-c636-40e5-8cec-a6878ac643e1': ("Leadership - The 7 C's to Success with Brian Tracy", 'Leadership - Les 7 C du Succès - Brian Tracy'),
    '663f362b-7183-4852-b618-c6141f414097': ('Leadership - Vision Make a difference Par John C.Maxwell', 'Leadership - La Vision : Faites la Différence - John C. Maxwell'),
    'a3cb3756-7e82-4fa4-bd66-29c666cee4c7': ('Leadership - Why Leaders eat last By Simon Sinek', 'Leadership - Pourquoi les Leaders Mangent en Dernier - Simon Sinek'),
    '93a7f37a-870a-4fdc-aef7-7f08706920ce': ('Les Brown Tells Emotional Stories That Will Leave You in Tears', 'Les Brown - Histoires Émouvantes qui vous Feront Pleurer'),
    '620e8d54-09fb-4a88-9811-9f0d3a15d895': ('Mindset - Invest in Yourself, Nurture Your Body and Mind', 'Mindset - Investissez en Vous-Même, Nourrissez Votre Corps et Votre Esprit'),
    '2ebd67eb-dcc7-4ffa-bdff-2fb9ee5520b8': ('Neuroscience - Earl Nightingale How to train your mind to get what you desire', "Neurosciences - Earl Nightingale : Comment Entraîner Votre Esprit"),
    '5d60812a-d245-4a2a-acbe-2ab03702fd7d': ('Simon Sinek Together is better', "Simon Sinek - Ensemble c'est Mieux"),
    'ec3847bf-1706-4741-9ec5-f8289d43365e': ('White Head et la theory du process', 'Whitehead et la Théorie du Processus'),
}

# ─── Générer le SQL ───────────────────────────────────────────────────────────
lines = ['-- Traduction FR des titres anglais en DB']
lines.append('-- campus_lessons')

for lid, (en, fr) in LESSONS.items():
    fr_escaped = fr.replace("'", "''")
    lines.append(f"UPDATE campus_lessons SET title = '{fr_escaped}', updated_at = datetime('now') WHERE id = '{lid}';")

lines.append('')
lines.append('-- campus_courses')
for cid, (en, fr) in COURSES.items():
    fr_escaped = fr.replace("'", "''")
    lines.append(f"UPDATE campus_courses SET title = '{fr_escaped}', updated_at = datetime('now') WHERE id = '{cid}';")

sql = '\n'.join(lines)

out = os.path.join(os.path.dirname(__file__), 'translate_to_fr.sql')
with open(out, 'w') as f:
    f.write(sql)

print(f'✅ SQL généré : {len(LESSONS)} leçons + {len(COURSES)} cours → {out}')

# ─── Mettre à jour strings.en.json avec les nouvelles clés FR ────────────────
# Les clés deviennent les titres FR, les valeurs restent EN
EN_STRINGS_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'static', 'locales', 'strings.en.json')
with open(EN_STRINGS_PATH, 'r') as f:
    en_data = json.load(f)

# Ajouter les nouvelles paires FR→EN (clé = nouveau titre FR, valeur = titre EN original)
for lid, (en_title, fr_title) in LESSONS.items():
    en_data[fr_title] = en_title

# Pour les cours, ajouter aussi
COURSES_FR_TO_EN = {
    '7 Habitudes des Personnes Hautement Efficaces - Stephen Covey': '7 Habits of Highly Effective People by Stephen Covey',
    'Bob Proctor - Les Onze Lois Universelles': 'Bob Proctor - Eleven Universal Laws',
    "Bob Proctor - La Loi de l'Attraction": 'Bob Proctor - Law of Attraction',
    'Bob Proctor - Vous êtes né riche': 'Bob Proctor - You Were Born Rich',
    'Entreprise - Comment faire propager vos idées - Seth Godin': 'Business - How to Get Your Ideas to Spread by Seth Godin',
    'Entreprise - Comment construire une entreprise qui fonctionne - Brian Tracy': 'Business - How to Build a Business That Works by Brian Tracy',
    'Entreprise - Comment créer une Startup': 'Business - How to Start a Startup',
    'Entreprise - Secrets des Millionnaires Autodidactes - Brian Tracy': 'Business - Secrets of Self-Made Millionaires by Brian Tracy',
    'Entreprise - Si vous ne comprenez pas les gens, vous ne comprenez pas les affaires - Simon Sinek': "Business - Simon Sinek: If You Don't Understand People, You Don't Understand Business",
    'Entreprise - Les 70 minutes les plus révélatrices de votre vie - Warren Buffett': 'Business - The Most Eye-Opening 70 Minutes of Your Life - Warren Buffett',
    "Finance - Comment Développer l'État d'Esprit du Trader": 'Finance - How to Develop a Trader Mindset',
    'Leadership - Les Clés pour Devenir un Leader - Dr Myles Munroe': 'Leadership - Keys to Becoming a Leader by Dr. Myles Munroe',
    'Leadership - Les 7 C du Succès - Brian Tracy': "Leadership - The 7 C's to Success with Brian Tracy",
    'Leadership - La Vision : Faites la Différence - John C. Maxwell': 'Leadership - Vision: Make a Difference by John C. Maxwell',
    'Leadership - Pourquoi les Leaders Mangent en Dernier - Simon Sinek': 'Leadership - Why Leaders Eat Last by Simon Sinek',
    'Les Brown - Histoires Émouvantes qui vous Feront Pleurer': 'Les Brown Tells Emotional Stories That Will Leave You in Tears',
    'Mindset - Investissez en Vous-Même, Nourrissez Votre Corps et Votre Esprit': 'Mindset - Invest in Yourself, Nurture Your Body and Mind',
    "Neurosciences - Earl Nightingale : Comment Entraîner Votre Esprit": 'Neuroscience - Earl Nightingale: How to Train Your Mind to Get What You Desire',
    "Simon Sinek - Ensemble c'est Mieux": 'Simon Sinek - Together Is Better',
    'Whitehead et la Théorie du Processus': 'Whitehead and the Process Theory',
}
for fr_key, en_val in COURSES_FR_TO_EN.items():
    en_data[fr_key] = en_val

en_data = dict(sorted(en_data.items()))
with open(EN_STRINGS_PATH, 'w') as f:
    json.dump(en_data, f, ensure_ascii=False, indent=2)

print(f'✅ strings.en.json mis à jour : {len(en_data)} entrées')

# ─── Mettre à jour ES/PT/DE ───────────────────────────────────────────────────
ES_ADD = {
    'Habitude 1 - Être Proactif': 'Hábito 1 - Ser Proactivo',
    'Habitude 2 - Commencer en ayant la fin en tête': 'Hábito 2 - Empezar con el fin en mente',
    'Habitude 3 - Donner la priorité aux priorités': 'Hábito 3 - Poner primero lo primero',
    'Habitude 4 - Penser gagnant-gagnant': 'Hábito 4 - Pensar ganar-ganar',
    'Habitude 5 - Chercher d\'abord à comprendre, puis à être compris': 'Hábito 5 - Buscar primero entender, luego ser entendido',
    'Habitude 6 - Créer des synergies': 'Hábito 6 - Sinergizar',
    'Habitude 7 - Aiguiser la scie': 'Hábito 7 - Afilar la sierra',
    'Développer l\'état d\'esprit du trader - Partie 1': 'Desarrollar la mentalidad del trader - Parte 1',
    'Développer l\'état d\'esprit du trader - Partie 2': 'Desarrollar la mentalidad del trader - Parte 2',
    'Développer l\'état d\'esprit du trader - Partie 3': 'Desarrollar la mentalidad del trader - Parte 3',
    'Développer l\'état d\'esprit du trader - Partie 4': 'Desarrollar la mentalidad del trader - Parte 4',
    'Développer l\'état d\'esprit du trader - Partie 5': 'Desarrollar la mentalidad del trader - Parte 5',
    'Comment construire une entreprise qui fonctionne': 'Cómo construir un negocio que funcione',
    'Comment faire propager vos idées': 'Cómo hacer que tus ideas se propaguen',
    'Comment créer une Startup - Cours 1': 'Cómo crear una Startup - Clase 1',
    '2. Équipe et Exécution - Cours 2': '2. Equipo y Ejecución - Clase 2',
    '3. Avant la Startup - Cours 3': '3. Antes de la Startup - Clase 3',
    '4. Construire le Produit, Écouter les Utilisateurs et Grandir - Cours 4': '4. Construir el Producto, Escuchar a los Usuarios y Crecer - Clase 4',
    '5. La Concurrence c\'est pour les Perdants - Peter Thiel - Cours 5': '5. La Competencia es para Perdedores - Clase 5',
    'Comment entraîner votre esprit pour obtenir ce que vous désirez': 'Cómo entrenar tu mente para obtener lo que deseas',
    'Si vous ne comprenez pas les gens, vous ne comprenez pas les affaires': 'Si no entiendes a las personas, no entiendes los negocios',
    'Introduction aux 5 niveaux de Leadership': 'Introducción a los 5 niveles de Liderazgo',
    'Investissez en vous-même, nourrissez votre corps et votre esprit': 'Invierte en ti mismo, cuida tu cuerpo y mente',
    'Les clés pour devenir un leader': 'Las claves para convertirse en líder',
    'Loi de l\'Attraction': 'Ley de la Atracción',
    'Les Brown - Histoires Émouvantes qui vous Feront Pleurer': 'Les Brown - Historias emotivas que te harán llorar',
    'Niveau 1 - Le niveau de la position': 'Nivel 1 - El nivel de la posición',
    'Niveau 2 - Le niveau de la permission': 'Nivel 2 - El nivel del permiso',
    'Niveau 3 - Le niveau de la production': 'Nivel 3 - El nivel de la producción',
    'Niveau 4 - Le niveau du développement des personnes': 'Nivel 4 - El nivel del desarrollo de personas',
    'Niveau 5 - Le niveau du sommet': 'Nivel 5 - El nivel cumbre',
    'Les secrets des millionnaires autodidactes': 'Los secretos de los millonarios autodidactas',
    'Le 4ème C - Les Contraintes': 'La 4a C - Las Restricciones',
    'Les 3 derniers C - Apprentissage Continu, Engagement et Courage': 'Los últimos 3 C - Aprendizaje Continuo, Compromiso y Valor',
    'Les 70 minutes les plus révélatrices de votre vie': 'Los 70 minutos más reveladores de tu vida',
    'Le 2ème C - La Compétence': 'La 2a C - La Competencia',
    'Le 3ème C - La Concentration': 'La 3a C - La Concentración',
    'Le 1er C - La Clarté': 'La 1a C - La Claridad',
    'Ensemble c\'est mieux': 'Juntos es mejor',
    'Vous êtes né riche - Partie 1': 'Naciste Rico - Parte 1',
    'Vous êtes né riche - Partie 2': 'Naciste Rico - Parte 2',
    'Vous êtes né riche - Partie 3': 'Naciste Rico - Parte 3',
    'Vous êtes né riche - Partie 4': 'Naciste Rico - Parte 4',
    'Vous êtes né riche - Partie 5': 'Naciste Rico - Parte 5',
    'Vous êtes né riche - Partie 6': 'Naciste Rico - Parte 6',
    '5. Apprendre à utiliser MetaTrader 4 (MT4)': '5. Aprender a usar MetaTrader 4 (MT4)',
    '7. Ajouter des indicateurs dans MetaTrader 4 (MT4)': '7. Agregar indicadores en MetaTrader 4 (MT4)',
    '8. Créer un template dans MetaTrader 4': '8. Crear una plantilla en MetaTrader 4',
    'Les Onze Lois Universelles': 'Las Once Leyes Universales',
    'Pourquoi les Leaders mangent en dernier': 'Por qué los Líderes Comen al Final',
    'La Vision : Faites la Différence': 'La Visión: Marca la Diferencia',
    # Cours
    '7 Habitudes des Personnes Hautement Efficaces - Stephen Covey': '7 Hábitos de las Personas Altamente Efectivas - Stephen Covey',
    'Bob Proctor - Les Onze Lois Universelles': 'Bob Proctor - Las Once Leyes Universales',
    "Bob Proctor - La Loi de l'Attraction": 'Bob Proctor - La Ley de la Atracción',
    'Bob Proctor - Vous êtes né riche': 'Bob Proctor - Naciste Rico',
    'Entreprise - Comment faire propager vos idées - Seth Godin': 'Empresa - Cómo hacer que tus ideas se propaguen - Seth Godin',
    'Entreprise - Comment construire une entreprise qui fonctionne - Brian Tracy': 'Empresa - Cómo construir un negocio que funcione - Brian Tracy',
    'Entreprise - Comment créer une Startup': 'Empresa - Cómo crear una Startup',
    'Entreprise - Secrets des Millionnaires Autodidactes - Brian Tracy': 'Empresa - Secretos de los Millonarios Autodidactas - Brian Tracy',
    'Entreprise - Si vous ne comprenez pas les gens, vous ne comprenez pas les affaires - Simon Sinek': 'Empresa - Si no entiendes a las personas, no entiendes los negocios - Simon Sinek',
    'Entreprise - Les 70 minutes les plus révélatrices de votre vie - Warren Buffett': 'Empresa - Los 70 minutos más reveladores de tu vida - Warren Buffett',
    "Finance - Comment Développer l'État d'Esprit du Trader": 'Finanzas - Cómo desarrollar la mentalidad del trader',
    'Leadership - Les Clés pour Devenir un Leader - Dr Myles Munroe': 'Liderazgo - Claves para convertirse en líder - Dr. Myles Munroe',
    'Leadership - Les 7 C du Succès - Brian Tracy': "Liderazgo - Los 7 C del Éxito - Brian Tracy",
    'Leadership - La Vision : Faites la Différence - John C. Maxwell': 'Liderazgo - La Visión: Marca la Diferencia - John C. Maxwell',
    'Leadership - Pourquoi les Leaders Mangent en Dernier - Simon Sinek': 'Liderazgo - Por qué los Líderes Comen al Final - Simon Sinek',
    'Les Brown - Histoires Émouvantes qui vous Feront Pleurer': 'Les Brown - Historias emotivas que te harán llorar',
    'Mindset - Investissez en Vous-Même, Nourrissez Votre Corps et Votre Esprit': 'Mentalidad - Invierte en ti mismo, cuida tu cuerpo y mente',
    "Neurosciences - Earl Nightingale : Comment Entraîner Votre Esprit": 'Neurociencia - Earl Nightingale: Cómo entrenar tu mente',
    "Simon Sinek - Ensemble c'est Mieux": 'Simon Sinek - Juntos es mejor',
    'Whitehead et la Théorie du Processus': 'Whitehead y la teoría del proceso',
}

PT_ADD = { k: v.replace('Hábito', 'Hábito').replace('Nivel', 'Nível').replace('Clase', 'Aula')
           .replace('Negocio', 'Negócio').replace('Nível', 'Nível') for k, v in ES_ADD.items() }
# Quelques overrides PT spécifiques
PT_OVERRIDES = {
    'Habitude 1 - Être Proactif': 'Hábito 1 - Ser Proativo',
    'Habitude 2 - Commencer en ayant la fin en tête': 'Hábito 2 - Começar com o fim em mente',
    'Habitude 3 - Donner la priorité aux priorités': 'Hábito 3 - Colocar o mais importante em primeiro lugar',
    'Habitude 4 - Penser gagnant-gagnant': 'Hábito 4 - Pensar ganha-ganha',
    'Habitude 5 - Chercher d\'abord à comprendre, puis à être compris': 'Hábito 5 - Procure primeiro entender, depois ser entendido',
    'Habitude 6 - Créer des synergies': 'Hábito 6 - Criar sinergias',
    'Habitude 7 - Aiguiser la scie': 'Hábito 7 - Afiar a serra',
    'Niveau 1 - Le niveau de la position': 'Nível 1 - O nível da posição',
    'Niveau 2 - Le niveau de la permission': 'Nível 2 - O nível da permissão',
    'Niveau 3 - Le niveau de la production': 'Nível 3 - O nível da produção',
    'Niveau 4 - Le niveau du développement des personnes': 'Nível 4 - O nível do desenvolvimento de pessoas',
    'Niveau 5 - Le niveau du sommet': 'Nível 5 - O nível do pináculo',
    'Vous êtes né riche - Partie 1': 'Você nasceu rico - Parte 1',
    'Vous êtes né riche - Partie 2': 'Você nasceu rico - Parte 2',
    'Vous êtes né riche - Partie 3': 'Você nasceu rico - Parte 3',
    'Vous êtes né riche - Partie 4': 'Você nasceu rico - Parte 4',
    'Vous êtes né riche - Partie 5': 'Você nasceu rico - Parte 5',
    'Vous êtes né riche - Partie 6': 'Você nasceu rico - Parte 6',
    'Ensemble c\'est mieux': 'Juntos é melhor',
    'Bob Proctor - Vous êtes né riche': 'Bob Proctor - Você Nasceu Rico',
    "Simon Sinek - Ensemble c'est Mieux": 'Simon Sinek - Juntos é Melhor',
}
PT_ADD.update(PT_OVERRIDES)

DE_ADD = {
    'Habitude 1 - Être Proactif': 'Gewohnheit 1 - Proaktiv sein',
    'Habitude 2 - Commencer en ayant la fin en tête': 'Gewohnheit 2 - Mit dem Ende im Sinn beginnen',
    'Habitude 3 - Donner la priorité aux priorités': 'Gewohnheit 3 - Das Wichtigste zuerst tun',
    'Habitude 4 - Penser gagnant-gagnant': 'Gewohnheit 4 - Gewinn-Gewinn denken',
    'Habitude 5 - Chercher d\'abord à comprendre, puis à être compris': 'Gewohnheit 5 - Erst verstehen, dann verstanden werden',
    'Habitude 6 - Créer des synergies': 'Gewohnheit 6 - Synergien schaffen',
    'Habitude 7 - Aiguiser la scie': 'Gewohnheit 7 - Die Säge schärfen',
    'Développer l\'état d\'esprit du trader - Partie 1': 'Trader-Mentalität entwickeln - Teil 1',
    'Développer l\'état d\'esprit du trader - Partie 2': 'Trader-Mentalität entwickeln - Teil 2',
    'Développer l\'état d\'esprit du trader - Partie 3': 'Trader-Mentalität entwickeln - Teil 3',
    'Développer l\'état d\'esprit du trader - Partie 4': 'Trader-Mentalität entwickeln - Teil 4',
    'Développer l\'état d\'esprit du trader - Partie 5': 'Trader-Mentalität entwickeln - Teil 5',
    'Comment construire une entreprise qui fonctionne': 'Wie man ein funktionierendes Unternehmen aufbaut',
    'Comment faire propager vos idées': 'Wie man Ideen verbreitet',
    'Comment créer une Startup - Cours 1': 'Wie man ein Startup gründet - Lektion 1',
    '2. Équipe et Exécution - Cours 2': '2. Team und Ausführung - Lektion 2',
    '3. Avant la Startup - Cours 3': '3. Vor dem Startup - Lektion 3',
    '4. Construire le Produit, Écouter les Utilisateurs et Grandir - Cours 4': '4. Produkt aufbauen, Nutzer anhören und wachsen - Lektion 4',
    '5. La Concurrence c\'est pour les Perdants - Peter Thiel - Cours 5': '5. Konkurrenz ist für Verlierer - Peter Thiel - Lektion 5',
    'Comment entraîner votre esprit pour obtenir ce que vous désirez': 'Wie man den Geist trainiert, um zu bekommen, was man begehrt',
    'Si vous ne comprenez pas les gens, vous ne comprenez pas les affaires': 'Wer Menschen nicht versteht, versteht kein Geschäft',
    'Introduction aux 5 niveaux de Leadership': 'Einführung in die 5 Führungsebenen',
    'Investissez en vous-même, nourrissez votre corps et votre esprit': 'Investiere in dich selbst, pflege Körper und Geist',
    'Les clés pour devenir un leader': 'Die Schlüssel zum Führen',
    'Loi de l\'Attraction': 'Das Gesetz der Anziehung',
    'Les Brown - Histoires Émouvantes qui vous Feront Pleurer': 'Les Brown - Bewegende Geschichten, die dich zu Tränen rühren',
    'Niveau 1 - Le niveau de la position': 'Ebene 1 - Die Positionsebene',
    'Niveau 2 - Le niveau de la permission': 'Ebene 2 - Die Erlaubnisebene',
    'Niveau 3 - Le niveau de la production': 'Ebene 3 - Die Produktionsebene',
    'Niveau 4 - Le niveau du développement des personnes': 'Ebene 4 - Die Personalentwicklungsebene',
    'Niveau 5 - Le niveau du sommet': 'Ebene 5 - Die Gipfelebene',
    'Les secrets des millionnaires autodidactes': 'Geheimnisse der Selfmade-Millionäre',
    'Le 4ème C - Les Contraintes': 'Das 4. K - Einschränkungen',
    'Les 3 derniers C - Apprentissage Continu, Engagement et Courage': 'Die letzten 3 K - Kontinuierliches Lernen, Engagement und Mut',
    'Les 70 minutes les plus révélatrices de votre vie': 'Die aufschlussreichsten 70 Minuten deines Lebens',
    'Le 2ème C - La Compétence': 'Das 2. K - Kompetenz',
    'Le 3ème C - La Concentration': 'Das 3. K - Konzentration',
    'Le 1er C - La Clarté': 'Das 1. K - Klarheit',
    'Ensemble c\'est mieux': 'Zusammen ist es besser',
    'Vous êtes né riche - Partie 1': 'Du wurdest reich geboren - Teil 1',
    'Vous êtes né riche - Partie 2': 'Du wurdest reich geboren - Teil 2',
    'Vous êtes né riche - Partie 3': 'Du wurdest reich geboren - Teil 3',
    'Vous êtes né riche - Partie 4': 'Du wurdest reich geboren - Teil 4',
    'Vous êtes né riche - Partie 5': 'Du wurdest reich geboren - Teil 5',
    'Vous êtes né riche - Partie 6': 'Du wurdest reich geboren - Teil 6',
    '5. Apprendre à utiliser MetaTrader 4 (MT4)': '5. MetaTrader 4 (MT4) benutzen lernen',
    '7. Ajouter des indicateurs dans MetaTrader 4 (MT4)': '7. Indikatoren in MetaTrader 4 hinzufügen',
    '8. Créer un template dans MetaTrader 4': '8. Eine Vorlage in MetaTrader 4 erstellen',
    'Les Onze Lois Universelles': 'Die Elf Universalgesetze',
    'Pourquoi les Leaders mangent en dernier': 'Warum Führungskräfte zuletzt essen',
    'La Vision : Faites la Différence': 'Die Vision: Mach einen Unterschied',
    # Cours
    '7 Habitudes des Personnes Hautement Efficaces - Stephen Covey': '7 Gewohnheiten hochwirksamer Menschen - Stephen Covey',
    'Bob Proctor - Les Onze Lois Universelles': 'Bob Proctor - Die Elf Universalgesetze',
    "Bob Proctor - La Loi de l'Attraction": 'Bob Proctor - Das Gesetz der Anziehung',
    'Bob Proctor - Vous êtes né riche': 'Bob Proctor - Du wurdest reich geboren',
    'Entreprise - Comment faire propager vos idées - Seth Godin': 'Unternehmen - Wie man Ideen verbreitet - Seth Godin',
    'Entreprise - Comment construire une entreprise qui fonctionne - Brian Tracy': 'Unternehmen - Wie man ein Unternehmen aufbaut - Brian Tracy',
    'Entreprise - Comment créer une Startup': 'Unternehmen - Wie man ein Startup gründet',
    'Entreprise - Secrets des Millionnaires Autodidactes - Brian Tracy': 'Unternehmen - Geheimnisse der Selfmade-Millionäre - Brian Tracy',
    'Entreprise - Si vous ne comprenez pas les gens, vous ne comprenez pas les affaires - Simon Sinek': 'Unternehmen - Simon Sinek: Wer Menschen nicht versteht, versteht kein Geschäft',
    'Entreprise - Les 70 minutes les plus révélatrices de votre vie - Warren Buffett': 'Unternehmen - Die aufschlussreichsten 70 Minuten deines Lebens - Warren Buffett',
    "Finance - Comment Développer l'État d'Esprit du Trader": 'Finanzen - Wie man eine Trader-Mentalität entwickelt',
    'Leadership - Les Clés pour Devenir un Leader - Dr Myles Munroe': 'Leadership - Schlüssel zum Führen - Dr. Myles Munroe',
    'Leadership - Les 7 C du Succès - Brian Tracy': 'Leadership - Die 7 K des Erfolgs - Brian Tracy',
    'Leadership - La Vision : Faites la Différence - John C. Maxwell': 'Leadership - Die Vision: Mach einen Unterschied - John C. Maxwell',
    'Leadership - Pourquoi les Leaders Mangent en Dernier - Simon Sinek': 'Leadership - Warum Führungskräfte zuletzt essen - Simon Sinek',
    'Les Brown - Histoires Émouvantes qui vous Feront Pleurer': 'Les Brown - Bewegende Geschichten, die dich zu Tränen rühren',
    'Mindset - Investissez en Vous-Même, Nourrissez Votre Corps et Votre Esprit': 'Mindset - Investiere in dich selbst, pflege Körper und Geist',
    "Neurosciences - Earl Nightingale : Comment Entraîner Votre Esprit": 'Neurowissenschaft - Earl Nightingale: Wie man den Geist trainiert',
    "Simon Sinek - Ensemble c'est Mieux": 'Simon Sinek - Zusammen ist es besser',
    'Whitehead et la Théorie du Processus': 'Whitehead und die Prozesstheorie',
}

for lang, additions in [('es', ES_ADD), ('pt', PT_ADD), ('de', DE_ADD)]:
    fpath = os.path.join(os.path.dirname(__file__), '..', 'public', 'static', 'locales', f'strings.{lang}.json')
    with open(fpath, 'r') as f:
        data = json.load(f)
    data.update(additions)
    data = dict(sorted(data.items()))
    with open(fpath, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'✅ strings.{lang}.json : {len(additions)} nouvelles entrées')

print('\n✅ Tout généré !')

#!/usr/bin/env python3
"""
Génère les traductions campus FR → EN/ES/PT/DE/HI
pour tous les titres de cours et de leçons.
"""

import json, os

# ─── Titres COURS : FR original → EN ──────────────────────────────────────────
COURSES_FR_TO_EN = {
    "7 Habits of highly effective people by Stephen Covey":
        "7 Habits of Highly Effective People by Stephen Covey",
    "Bob Proctor - Eleven Universal Law":
        "Bob Proctor - Eleven Universal Laws",
    "Bob Proctor - Law Of Attraction":
        "Bob Proctor - Law of Attraction",
    "Bob Proctor - You were born rich":
        "Bob Proctor - You Were Born Rich",
    "Comment prendre sa vie en main par Jim Rohn":
        "How to Take Control of Your Life by Jim Rohn",
    "Digital - Cours Complet Microsoft Excel":
        "Digital - Complete Microsoft Excel Course",
    "Digital - Cours Complet d'Initiation Photoshop - De Zéro à Pro":
        "Digital - Complete Photoshop Course - Zero to Pro",
    "Digital - Formation Sur les Secrets d'Instagram":
        "Digital - Instagram Secrets Training",
    "Dossier de Lancement":
        "Launch Dossier",
    "Entreprise - Effondrement Économique, Monétaire & Civilisationnel":
        "Business - Economic, Monetary & Civilizational Collapse",
    "Entreprise - HOW TO GET YOUR IDEAS TO SPREAD BY SETH GODIN":
        "Business - How to Get Your Ideas to Spread by Seth Godin",
    "Entreprise - How to build a business that works By Brian Tracy":
        "Business - How to Build a Business That Works by Brian Tracy",
    "Entreprise - How to start a Startup":
        "Business - How to Start a Startup",
    "Entreprise - L'Intelligence Émotionnelle en Entreprise":
        "Business - Emotional Intelligence in Business",
    "Entreprise - La Mécanique de la Machine Économique":
        "Business - The Mechanics of the Economic Machine",
    "Entreprise - Napoleon Hill - Les lois du succes":
        "Business - Napoleon Hill - The Laws of Success",
    "Entreprise - SECRETS OF SELF-MADE MILLIONAIRES BY BRIAN TRACY":
        "Business - Secrets of Self-Made Millionaires by Brian Tracy",
    "Entreprise - Simon Sinek If you dont understand people, you dont understand business":
        "Business - Simon Sinek: If You Don't Understand People, You Don't Understand Business",
    "Entreprise - The Most Eye Opening 70 Minutes of Your life Warren Buffets":
        "Business - The Most Eye-Opening 70 Minutes of Your Life - Warren Buffett",
    "Finance - Formation Trading (Débutant)":
        "Finance - Trading Course (Beginner)",
    "Finance - How to Develop a Trader Mindset":
        "Finance - How to Develop a Trader Mindset",
    "LEADER PRESENTATION":
        "LEADER PRESENTATION",
    "Leadership - 21 lois du Leadership Par John C Maxwell":
        "Leadership - 21 Laws of Leadership by John C. Maxwell",
    "Leadership - Elever votre niveau de Leadership Par John C.Maxwell":
        "Leadership - Elevate Your Leadership Level by John C. Maxwell",
    "Leadership - Keys to becoming a Leader by Dr Myles Munroe":
        "Leadership - Keys to Becoming a Leader by Dr. Myles Munroe",
    "Leadership - Les cinq niveau du Leadership par John C.Maxwell":
        "Leadership - The 5 Levels of Leadership by John C. Maxwell",
    "Leadership - The 7 C's to Success with Brian Tracy":
        "Leadership - The 7 C's to Success with Brian Tracy",
    "Leadership - Vision Make a difference Par John C.Maxwell":
        "Leadership - Vision: Make a Difference by John C. Maxwell",
    "Leadership - Why Leaders eat last By Simon Sinek":
        "Leadership - Why Leaders Eat Last by Simon Sinek",
    "Les Brown Tells Emotional Stories That Will Leave You in Tears":
        "Les Brown Tells Emotional Stories That Will Leave You in Tears",
    "Mindset - Cessez d'Être Gentil, Soyez Vrai ! - Thomas d'Ansembourg":
        "Mindset - Stop Being Nice, Be Real! - Thomas d'Ansembourg",
    "Mindset - Daniel Goleman - L'Intelligence Émotionnelle":
        "Mindset - Daniel Goleman - Emotional Intelligence",
    "Mindset - Invest in Yourself, Nurture Your Body and Mind":
        "Mindset - Invest in Yourself, Nurture Your Body and Mind",
    "Mindset - Le Courage d'Être Soi au Présent - Jacques Salomé":
        "Mindset - The Courage to Be Yourself in the Present - Jacques Salomé",
    "Mindset - Thomas d'Ansembourg - Réenchanter le Monde (CNV)":
        "Mindset - Thomas d'Ansembourg - Re-enchanting the World (NVC)",
    "Mindset - Thomas d'Ansembourg - Être Adulte":
        "Mindset - Thomas d'Ansembourg - Being an Adult",
    "Mindset - Être Heureux n'Est Pas Nécessairement Confortable - T. d'Ansembourg":
        "Mindset - Being Happy Is Not Necessarily Comfortable - T. d'Ansembourg",
    "Neuroscience - Earl Nightingale How to train your mind to get what you desire":
        "Neuroscience - Earl Nightingale: How to Train Your Mind to Get What You Desire",
    "Neuroscience - Le Cerveau Fait Son Monde":
        "Neuroscience - The Brain Creates Its World",
    "Neuroscience - Peut-on Penser Contre Son Cerveau ? - Étienne Klein":
        "Neuroscience - Can We Think Against Our Brain? - Étienne Klein",
    "Neuroscience - Placebo & Neurosciences Par Dr Joe Dispenza":
        "Neuroscience - Placebo & Neuroscience by Dr. Joe Dispenza",
    "Programme de formation LEADER":
        "LEADER Training Program",
    "S.O.P":
        "S.O.P",
    "Sagesse Intemporelle par Jim Rohn":
        "Timeless Wisdom by Jim Rohn",
    "Simon Sinek Together is better":
        "Simon Sinek - Together Is Better",
    "Webinar":
        "Webinar",
    "White Head et la theory du process":
        "Whitehead and the Process Theory",
}

# ─── Titres LEÇONS (anglais) : original → FR ──────────────────────────────────
# Clé = titre stocké en DB (souvent anglais), Valeur = traduction FR affichée
LESSONS_EN_TO_FR = {
    "2. Team and Execution - Lecture 2":
        "2. Équipe et Exécution - Cours 2",
    "3. Before the startup - Lecture 3":
        "3. Avant la Startup - Cours 3",
    "4. Building Product, Talking to users and Growing - Lecture 4":
        "4. Construire le Produit, Écouter les Utilisateurs et Grandir - Cours 4",
    "5. Competion is for losers Peter Thiel - Lecture 5":
        "5. La Concurrence, c'est pour les Perdants - Peter Thiel - Cours 5",
    "Habit 2 - Begin with the end in mind":
        "Habitude 2 - Commencer par la fin en tête",
    "Habit 5 - Seek first to understand, then to be understood":
        "Habitude 5 - Chercher d'abord à comprendre, puis à être compris",
    "Habit 7 - Sharpen the saw":
        "Habitude 7 - Aiguiser la scie",
    "How to Develop a Trader Mindset Part 1":
        "Développer l'État d'Esprit du Trader - Partie 1",
    "How to Develop a Trader Mindset Part 2":
        "Développer l'État d'Esprit du Trader - Partie 2",
    "How to Develop a Trader Mindset Part 3":
        "Développer l'État d'Esprit du Trader - Partie 3",
    "How to Develop a Trader Mindset Part 4":
        "Développer l'État d'Esprit du Trader - Partie 4",
    "How to Develop a Trader Mindset Part 5":
        "Développer l'État d'Esprit du Trader - Partie 5",
    "How to build a business that works":
        "Comment construire une entreprise qui fonctionne",
    "How to get your ideas to spread":
        "Comment faire propager vos idées",
    "How to start a Startup- Lecture 1":
        "Comment créer une Startup - Cours 1",
    "How to train your mind to get what you desire":
        "Comment entraîner votre esprit pour obtenir ce que vous désirez",
    "If you don't understand people, you don't understand business":
        "Si vous ne comprenez pas les gens, vous ne comprenez pas les affaires",
    "Introduction to the 5 levels of Leadership":
        "Introduction aux 5 niveaux de Leadership",
    "Invest in yourself, nurture your body and mind":
        "Investissez en vous-même, nourrissez votre corps et votre esprit",
    "Keys to becoming a leader":
        "Les clés pour devenir un leader",
    "Law of Attraction":
        "Loi de l'Attraction",
    "Les Brown Tells Emotional Stories That Will Leave You in Tears":
        "Les Brown - Histoires Émouvantes qui vous Feront Pleurer",
    "Level 1 - The position level":
        "Niveau 1 - Le niveau de la position",
    "Level 2 - The permission level":
        "Niveau 2 - Le niveau de la permission",
    "Level 3 - The production level":
        "Niveau 3 - Le niveau de la production",
    "Level 4 - The people development level":
        "Niveau 4 - Le niveau du développement des personnes",
    "Level 5 - The pinnacle level":
        "Niveau 5 - Le niveau du sommet",
    "Secrets of self made millionaires":
        "Les secrets des millionnaires autodidactes",
    "The Forth C - Constraints":
        "Le 4e C - Les Contraintes",
    "The Last Three C's - Continuous Learning, Commitment and Courage":
        "Les 3 derniers C - Apprentissage Continu, Engagement et Courage",
    "The Most Eye Opening 70 Minutes of Your life":
        "Les 70 minutes les plus révélatrices de votre vie",
    "The Second C - Competence":
        "Le 2e C - La Compétence",
    "The Third C - Concentration":
        "Le 3e C - La Concentration",
    "The first C - Clarity":
        "Le 1er C - La Clarté",
    "Together is better":
        "Ensemble c'est mieux",
    "You were born Rich Part 6":
        "Vous êtes né riche - Partie 6",
    "You were born rich part 1":
        "Vous êtes né riche - Partie 1",
    "You were born rich part 2":
        "Vous êtes né riche - Partie 2",
    "You were born rich part 3":
        "Vous êtes né riche - Partie 3",
    "You were born rich part 4":
        "Vous êtes né riche - Partie 4",
    "You were born rich part 5":
        "Vous êtes né riche - Partie 5",
    # Leçons déjà en FR mais avec fautes / anglicismes
    "5. APPRENDRE A UTILISER METATRADER 4 MT4":
        "5. Apprendre à utiliser MetaTrader 4 (MT4)",
    "7. JOUTER DES INDICATEURS DANS METATRADER 4 MT4":
        "7. Ajouter des indicateurs dans MetaTrader 4 (MT4)",
    "8. CREER UN TEMPLATE DANS METATRADER 4":
        "8. Créer un template dans MetaTrader 4",
}

# ─── Traductions EN → ES (approximatif) ───────────────────────────────────────
COURSES_FR_TO_ES = {
    "7 Habits of highly effective people by Stephen Covey":
        "7 Hábitos de las Personas Altamente Efectivas - Stephen Covey",
    "Bob Proctor - Eleven Universal Law":
        "Bob Proctor - Las Once Leyes Universales",
    "Bob Proctor - Law Of Attraction":
        "Bob Proctor - La Ley de la Atracción",
    "Bob Proctor - You were born rich":
        "Bob Proctor - Naciste Rico",
    "Comment prendre sa vie en main par Jim Rohn":
        "Cómo Tomar las Riendas de tu Vida - Jim Rohn",
    "Digital - Cours Complet Microsoft Excel":
        "Digital - Curso Completo de Microsoft Excel",
    "Digital - Cours Complet d'Initiation Photoshop - De Zéro à Pro":
        "Digital - Curso Completo de Photoshop - De Cero a Pro",
    "Digital - Formation Sur les Secrets d'Instagram":
        "Digital - Formación sobre los Secretos de Instagram",
    "Dossier de Lancement":
        "Dossier de Lanzamiento",
    "Entreprise - Effondrement Économique, Monétaire & Civilisationnel":
        "Empresa - Colapso Económico, Monetario y Civilizatorio",
    "Entreprise - HOW TO GET YOUR IDEAS TO SPREAD BY SETH GODIN":
        "Empresa - Cómo Hacer que tus Ideas se Propaguen - Seth Godin",
    "Entreprise - How to build a business that works By Brian Tracy":
        "Empresa - Cómo Construir un Negocio que Funcione - Brian Tracy",
    "Entreprise - How to start a Startup":
        "Empresa - Cómo Iniciar una Startup",
    "Entreprise - L'Intelligence Émotionnelle en Entreprise":
        "Empresa - La Inteligencia Emocional en los Negocios",
    "Entreprise - La Mécanique de la Machine Économique":
        "Empresa - La Mecánica de la Máquina Económica",
    "Entreprise - Napoleon Hill - Les lois du succes":
        "Empresa - Napoleon Hill - Las Leyes del Éxito",
    "Entreprise - SECRETS OF SELF-MADE MILLIONAIRES BY BRIAN TRACY":
        "Empresa - Secretos de los Millonarios Autodidactas - Brian Tracy",
    "Entreprise - Simon Sinek If you dont understand people, you dont understand business":
        "Empresa - Simon Sinek: Si no Entiendes a la Gente, no Entiendes los Negocios",
    "Entreprise - The Most Eye Opening 70 Minutes of Your life Warren Buffets":
        "Empresa - Los 70 Minutos más Reveladores de tu Vida - Warren Buffett",
    "Finance - Formation Trading (Débutant)":
        "Finanzas - Curso de Trading (Principiante)",
    "Finance - How to Develop a Trader Mindset":
        "Finanzas - Cómo Desarrollar la Mentalidad de un Trader",
    "LEADER PRESENTATION":
        "PRESENTACIÓN LEADER",
    "Leadership - 21 lois du Leadership Par John C Maxwell":
        "Liderazgo - Las 21 Leyes del Liderazgo - John C. Maxwell",
    "Leadership - Elever votre niveau de Leadership Par John C.Maxwell":
        "Liderazgo - Eleva tu Nivel de Liderazgo - John C. Maxwell",
    "Leadership - Keys to becoming a Leader by Dr Myles Munroe":
        "Liderazgo - Claves para Convertirte en Líder - Dr. Myles Munroe",
    "Leadership - Les cinq niveau du Leadership par John C.Maxwell":
        "Liderazgo - Los 5 Niveles del Liderazgo - John C. Maxwell",
    "Leadership - The 7 C's to Success with Brian Tracy":
        "Liderazgo - Las 7 C del Éxito - Brian Tracy",
    "Leadership - Vision Make a difference Par John C.Maxwell":
        "Liderazgo - Visión: Marca la Diferencia - John C. Maxwell",
    "Leadership - Why Leaders eat last By Simon Sinek":
        "Liderazgo - Por qué los Líderes Comen al Final - Simon Sinek",
    "Les Brown Tells Emotional Stories That Will Leave You in Tears":
        "Les Brown - Historias Emotivas que te Harán Llorar",
    "Mindset - Cessez d'Être Gentil, Soyez Vrai ! - Thomas d'Ansembourg":
        "Mentalidad - ¡Deja de ser Amable, Sé Auténtico! - Thomas d'Ansembourg",
    "Mindset - Daniel Goleman - L'Intelligence Émotionnelle":
        "Mentalidad - Daniel Goleman - Inteligencia Emocional",
    "Mindset - Invest in Yourself, Nurture Your Body and Mind":
        "Mentalidad - Invierte en Ti Mismo, Cuida tu Cuerpo y Mente",
    "Mindset - Le Courage d'Être Soi au Présent - Jacques Salomé":
        "Mentalidad - El Coraje de Ser Uno Mismo en el Presente - Jacques Salomé",
    "Mindset - Thomas d'Ansembourg - Réenchanter le Monde (CNV)":
        "Mentalidad - Thomas d'Ansembourg - Reencantando el Mundo (CNV)",
    "Mindset - Thomas d'Ansembourg - Être Adulte":
        "Mentalidad - Thomas d'Ansembourg - Ser Adulto",
    "Mindset - Être Heureux n'Est Pas Nécessairement Confortable - T. d'Ansembourg":
        "Mentalidad - Ser Feliz no es Necesariamente Cómodo - T. d'Ansembourg",
    "Neuroscience - Earl Nightingale How to train your mind to get what you desire":
        "Neurociencia - Earl Nightingale: Cómo Entrenar tu Mente para Obtener lo que Deseas",
    "Neuroscience - Le Cerveau Fait Son Monde":
        "Neurociencia - El Cerebro Crea su Mundo",
    "Neuroscience - Peut-on Penser Contre Son Cerveau ? - Étienne Klein":
        "Neurociencia - ¿Podemos Pensar Contra Nuestro Cerebro? - Étienne Klein",
    "Neuroscience - Placebo & Neurosciences Par Dr Joe Dispenza":
        "Neurociencia - Placebo y Neurociencia - Dr. Joe Dispenza",
    "Programme de formation LEADER":
        "Programa de Formación LEADER",
    "S.O.P": "S.O.P",
    "Sagesse Intemporelle par Jim Rohn":
        "Sabiduría Intemporal - Jim Rohn",
    "Simon Sinek Together is better":
        "Simon Sinek - Juntos es Mejor",
    "Webinar": "Webinar",
    "White Head et la theory du process":
        "Whitehead y la Teoría del Proceso",
}

# ─── Traductions EN → PT ───────────────────────────────────────────────────────
COURSES_FR_TO_PT = {
    "7 Habits of highly effective people by Stephen Covey":
        "7 Hábitos das Pessoas Altamente Eficazes - Stephen Covey",
    "Bob Proctor - Eleven Universal Law":
        "Bob Proctor - As Onze Leis Universais",
    "Bob Proctor - Law Of Attraction":
        "Bob Proctor - A Lei da Atração",
    "Bob Proctor - You were born rich":
        "Bob Proctor - Você Nasceu Rico",
    "Comment prendre sa vie en main par Jim Rohn":
        "Como Tomar as Rédeas da sua Vida - Jim Rohn",
    "Digital - Cours Complet Microsoft Excel":
        "Digital - Curso Completo de Microsoft Excel",
    "Digital - Cours Complet d'Initiation Photoshop - De Zéro à Pro":
        "Digital - Curso Completo de Photoshop - Do Zero ao Pro",
    "Digital - Formation Sur les Secrets d'Instagram":
        "Digital - Formação sobre os Segredos do Instagram",
    "Dossier de Lancement":
        "Dossiê de Lançamento",
    "Entreprise - Effondrement Économique, Monétaire & Civilisationnel":
        "Negócios - Colapso Econômico, Monetário e Civilizacional",
    "Entreprise - HOW TO GET YOUR IDEAS TO SPREAD BY SETH GODIN":
        "Negócios - Como Fazer Suas Ideias se Espalharem - Seth Godin",
    "Entreprise - How to build a business that works By Brian Tracy":
        "Negócios - Como Construir um Negócio que Funciona - Brian Tracy",
    "Entreprise - How to start a Startup":
        "Negócios - Como Iniciar uma Startup",
    "Entreprise - L'Intelligence Émotionnelle en Entreprise":
        "Negócios - Inteligência Emocional nos Negócios",
    "Entreprise - La Mécanique de la Machine Économique":
        "Negócios - A Mecânica da Máquina Econômica",
    "Entreprise - Napoleon Hill - Les lois du succes":
        "Negócios - Napoleon Hill - As Leis do Sucesso",
    "Entreprise - SECRETS OF SELF-MADE MILLIONAIRES BY BRIAN TRACY":
        "Negócios - Segredos dos Milionários Autodidatas - Brian Tracy",
    "Entreprise - Simon Sinek If you dont understand people, you dont understand business":
        "Negócios - Simon Sinek: Se você não Entende as Pessoas, não Entende os Negócios",
    "Entreprise - The Most Eye Opening 70 Minutes of Your life Warren Buffets":
        "Negócios - Os 70 Minutos Mais Reveladores da sua Vida - Warren Buffett",
    "Finance - Formation Trading (Débutant)":
        "Finanças - Curso de Trading (Iniciante)",
    "Finance - How to Develop a Trader Mindset":
        "Finanças - Como Desenvolver a Mentalidade de um Trader",
    "LEADER PRESENTATION":
        "APRESENTAÇÃO LEADER",
    "Leadership - 21 lois du Leadership Par John C Maxwell":
        "Liderança - As 21 Leis da Liderança - John C. Maxwell",
    "Leadership - Elever votre niveau de Leadership Par John C.Maxwell":
        "Liderança - Eleve seu Nível de Liderança - John C. Maxwell",
    "Leadership - Keys to becoming a Leader by Dr Myles Munroe":
        "Liderança - Chaves para se Tornar um Líder - Dr. Myles Munroe",
    "Leadership - Les cinq niveau du Leadership par John C.Maxwell":
        "Liderança - Os 5 Níveis da Liderança - John C. Maxwell",
    "Leadership - The 7 C's to Success with Brian Tracy":
        "Liderança - Os 7 C's do Sucesso - Brian Tracy",
    "Leadership - Vision Make a difference Par John C.Maxwell":
        "Liderança - Visão: Faça a Diferença - John C. Maxwell",
    "Leadership - Why Leaders eat last By Simon Sinek":
        "Liderança - Por que os Líderes Comem por Último - Simon Sinek",
    "Les Brown Tells Emotional Stories That Will Leave You in Tears":
        "Les Brown - Histórias Emocionantes que vão te Fazer Chorar",
    "Mindset - Cessez d'Être Gentil, Soyez Vrai ! - Thomas d'Ansembourg":
        "Mentalidade - Pare de ser Gentil, Seja Verdadeiro! - Thomas d'Ansembourg",
    "Mindset - Daniel Goleman - L'Intelligence Émotionnelle":
        "Mentalidade - Daniel Goleman - Inteligência Emocional",
    "Mindset - Invest in Yourself, Nurture Your Body and Mind":
        "Mentalidade - Invista em Você Mesmo, Cuide do seu Corpo e Mente",
    "Mindset - Le Courage d'Être Soi au Présent - Jacques Salomé":
        "Mentalidade - A Coragem de Ser Si Mesmo no Presente - Jacques Salomé",
    "Mindset - Thomas d'Ansembourg - Réenchanter le Monde (CNV)":
        "Mentalidade - Thomas d'Ansembourg - Re-encantar o Mundo (CNV)",
    "Mindset - Thomas d'Ansembourg - Être Adulte":
        "Mentalidade - Thomas d'Ansembourg - Ser Adulto",
    "Mindset - Être Heureux n'Est Pas Nécessairement Confortable - T. d'Ansembourg":
        "Mentalidade - Ser Feliz não é Necessariamente Confortável - T. d'Ansembourg",
    "Neuroscience - Earl Nightingale How to train your mind to get what you desire":
        "Neurociência - Earl Nightingale: Como Treinar sua Mente para Obter o que Deseja",
    "Neuroscience - Le Cerveau Fait Son Monde":
        "Neurociência - O Cérebro Cria seu Mundo",
    "Neuroscience - Peut-on Penser Contre Son Cerveau ? - Étienne Klein":
        "Neurociência - Podemos Pensar Contra Nosso Cérebro? - Étienne Klein",
    "Neuroscience - Placebo & Neurosciences Par Dr Joe Dispenza":
        "Neurociência - Placebo e Neurociência - Dr. Joe Dispenza",
    "Programme de formation LEADER":
        "Programa de Formação LEADER",
    "S.O.P": "S.O.P",
    "Sagesse Intemporelle par Jim Rohn":
        "Sabedoria Atemporal - Jim Rohn",
    "Simon Sinek Together is better":
        "Simon Sinek - Juntos é Melhor",
    "Webinar": "Webinar",
    "White Head et la theory du process":
        "Whitehead e a Teoria do Processo",
}

# ─── Traductions EN → DE ───────────────────────────────────────────────────────
COURSES_FR_TO_DE = {
    "7 Habits of highly effective people by Stephen Covey":
        "7 Gewohnheiten hochwirksamer Menschen - Stephen Covey",
    "Bob Proctor - Eleven Universal Law":
        "Bob Proctor - Die Elf Universalgesetze",
    "Bob Proctor - Law Of Attraction":
        "Bob Proctor - Das Gesetz der Anziehung",
    "Bob Proctor - You were born rich":
        "Bob Proctor - Du wurdest reich geboren",
    "Comment prendre sa vie en main par Jim Rohn":
        "Wie man sein Leben in die Hand nimmt - Jim Rohn",
    "Digital - Cours Complet Microsoft Excel":
        "Digital - Vollständiger Microsoft Excel Kurs",
    "Digital - Cours Complet d'Initiation Photoshop - De Zéro à Pro":
        "Digital - Vollständiger Photoshop Kurs - Von Null zum Profi",
    "Digital - Formation Sur les Secrets d'Instagram":
        "Digital - Instagram Geheimnisse Training",
    "Dossier de Lancement":
        "Startmappe",
    "Entreprise - Effondrement Économique, Monétaire & Civilisationnel":
        "Unternehmen - Wirtschaftlicher, Monetärer & Zivilisatorischer Zusammenbruch",
    "Entreprise - HOW TO GET YOUR IDEAS TO SPREAD BY SETH GODIN":
        "Unternehmen - Wie Sie Ihre Ideen verbreiten - Seth Godin",
    "Entreprise - How to build a business that works By Brian Tracy":
        "Unternehmen - Wie man ein funktionierendes Unternehmen aufbaut - Brian Tracy",
    "Entreprise - How to start a Startup":
        "Unternehmen - Wie man ein Startup gründet",
    "Entreprise - L'Intelligence Émotionnelle en Entreprise":
        "Unternehmen - Emotionale Intelligenz im Unternehmen",
    "Entreprise - La Mécanique de la Machine Économique":
        "Unternehmen - Die Mechanik der Wirtschaftsmaschine",
    "Entreprise - Napoleon Hill - Les lois du succes":
        "Unternehmen - Napoleon Hill - Die Gesetze des Erfolgs",
    "Entreprise - SECRETS OF SELF-MADE MILLIONAIRES BY BRIAN TRACY":
        "Unternehmen - Geheimnisse der Selfmade-Millionäre - Brian Tracy",
    "Entreprise - Simon Sinek If you dont understand people, you dont understand business":
        "Unternehmen - Simon Sinek: Wer Menschen nicht versteht, versteht kein Geschäft",
    "Entreprise - The Most Eye Opening 70 Minutes of Your life Warren Buffets":
        "Unternehmen - Die aufschlussreichsten 70 Minuten Ihres Lebens - Warren Buffett",
    "Finance - Formation Trading (Débutant)":
        "Finanzen - Trading Kurs (Anfänger)",
    "Finance - How to Develop a Trader Mindset":
        "Finanzen - Wie man eine Trader-Mentalität entwickelt",
    "LEADER PRESENTATION":
        "LEADER PRÄSENTATION",
    "Leadership - 21 lois du Leadership Par John C Maxwell":
        "Leadership - Die 21 Gesetze der Führung - John C. Maxwell",
    "Leadership - Elever votre niveau de Leadership Par John C.Maxwell":
        "Leadership - Heben Sie Ihr Führungsniveau - John C. Maxwell",
    "Leadership - Keys to becoming a Leader by Dr Myles Munroe":
        "Leadership - Schlüssel zum Führen - Dr. Myles Munroe",
    "Leadership - Les cinq niveau du Leadership par John C.Maxwell":
        "Leadership - Die 5 Ebenen der Führung - John C. Maxwell",
    "Leadership - The 7 C's to Success with Brian Tracy":
        "Leadership - Die 7 K's zum Erfolg - Brian Tracy",
    "Leadership - Vision Make a difference Par John C.Maxwell":
        "Leadership - Vision: Mach einen Unterschied - John C. Maxwell",
    "Leadership - Why Leaders eat last By Simon Sinek":
        "Leadership - Warum Führungskräfte zuletzt essen - Simon Sinek",
    "Les Brown Tells Emotional Stories That Will Leave You in Tears":
        "Les Brown - Bewegende Geschichten, die Sie zu Tränen rühren",
    "Mindset - Cessez d'Être Gentil, Soyez Vrai ! - Thomas d'Ansembourg":
        "Mindset - Hör auf nett zu sein, sei echt! - Thomas d'Ansembourg",
    "Mindset - Daniel Goleman - L'Intelligence Émotionnelle":
        "Mindset - Daniel Goleman - Emotionale Intelligenz",
    "Mindset - Invest in Yourself, Nurture Your Body and Mind":
        "Mindset - Investiere in dich selbst, pflege Körper und Geist",
    "Mindset - Le Courage d'Être Soi au Présent - Jacques Salomé":
        "Mindset - Der Mut, man selbst zu sein - Jacques Salomé",
    "Mindset - Thomas d'Ansembourg - Réenchanter le Monde (CNV)":
        "Mindset - Thomas d'Ansembourg - Die Welt neu verzaubern (GFK)",
    "Mindset - Thomas d'Ansembourg - Être Adulte":
        "Mindset - Thomas d'Ansembourg - Erwachsen sein",
    "Mindset - Être Heureux n'Est Pas Nécessairement Confortable - T. d'Ansembourg":
        "Mindset - Glücklich sein ist nicht unbedingt bequem - T. d'Ansembourg",
    "Neuroscience - Earl Nightingale How to train your mind to get what you desire":
        "Neurowissenschaft - Earl Nightingale: Wie man seinen Geist trainiert",
    "Neuroscience - Le Cerveau Fait Son Monde":
        "Neurowissenschaft - Das Gehirn erschafft seine Welt",
    "Neuroscience - Peut-on Penser Contre Son Cerveau ? - Étienne Klein":
        "Neurowissenschaft - Können wir gegen unser Gehirn denken? - Étienne Klein",
    "Neuroscience - Placebo & Neurosciences Par Dr Joe Dispenza":
        "Neurowissenschaft - Placebo & Neurowissenschaft - Dr. Joe Dispenza",
    "Programme de formation LEADER":
        "LEADER Ausbildungsprogramm",
    "S.O.P": "S.O.P",
    "Sagesse Intemporelle par Jim Rohn":
        "Zeitlose Weisheit - Jim Rohn",
    "Simon Sinek Together is better":
        "Simon Sinek - Zusammen ist es besser",
    "Webinar": "Webinar",
    "White Head et la theory du process":
        "Whitehead und die Prozesstheorie",
}

# ─── Traductions leçons pour ES, PT, DE ───────────────────────────────────────
# (On garde les traductions FR→EN déjà faites, on ajoute les autres langues ci-dessous)
LESSONS_EN_TO_ES = {
    "2. Team and Execution - Lecture 2": "2. Equipo y Ejecución - Clase 2",
    "3. Before the startup - Lecture 3": "3. Antes de la Startup - Clase 3",
    "4. Building Product, Talking to users and Growing - Lecture 4": "4. Construir el Producto, Hablar con Usuarios y Crecer - Clase 4",
    "5. Competion is for losers Peter Thiel - Lecture 5": "5. La Competencia es para Perdedores - Peter Thiel - Clase 5",
    "Habit 2 - Begin with the end in mind": "Hábito 2 - Empezar con el fin en mente",
    "Habit 5 - Seek first to understand, then to be understood": "Hábito 5 - Procura primero comprender, luego ser comprendido",
    "Habit 7 - Sharpen the saw": "Hábito 7 - Afilar la sierra",
    "How to Develop a Trader Mindset Part 1": "Desarrollar la Mentalidad del Trader - Parte 1",
    "How to Develop a Trader Mindset Part 2": "Desarrollar la Mentalidad del Trader - Parte 2",
    "How to Develop a Trader Mindset Part 3": "Desarrollar la Mentalidad del Trader - Parte 3",
    "How to Develop a Trader Mindset Part 4": "Desarrollar la Mentalidad del Trader - Parte 4",
    "How to Develop a Trader Mindset Part 5": "Desarrollar la Mentalidad del Trader - Parte 5",
    "How to build a business that works": "Cómo construir un negocio que funcione",
    "How to get your ideas to spread": "Cómo hacer que tus ideas se propaguen",
    "How to start a Startup- Lecture 1": "Cómo iniciar una Startup - Clase 1",
    "How to train your mind to get what you desire": "Cómo entrenar tu mente para obtener lo que deseas",
    "If you don't understand people, you don't understand business": "Si no entiendes a las personas, no entiendes los negocios",
    "Introduction to the 5 levels of Leadership": "Introducción a los 5 niveles de Liderazgo",
    "Invest in yourself, nurture your body and mind": "Invierte en ti mismo, cuida tu cuerpo y mente",
    "Keys to becoming a leader": "Claves para convertirse en líder",
    "Law of Attraction": "Ley de la Atracción",
    "Les Brown Tells Emotional Stories That Will Leave You in Tears": "Les Brown - Historias emotivas que te harán llorar",
    "Level 1 - The position level": "Nivel 1 - El nivel de la posición",
    "Level 2 - The permission level": "Nivel 2 - El nivel del permiso",
    "Level 3 - The production level": "Nivel 3 - El nivel de la producción",
    "Level 4 - The people development level": "Nivel 4 - El nivel del desarrollo de personas",
    "Level 5 - The pinnacle level": "Nivel 5 - El nivel cumbre",
    "Secrets of self made millionaires": "Secretos de los millonarios autodidactas",
    "The Forth C - Constraints": "La 4a C - Las Restricciones",
    "The Last Three C's - Continuous Learning, Commitment and Courage": "Las últimas 3 C - Aprendizaje Continuo, Compromiso y Valor",
    "The Most Eye Opening 70 Minutes of Your life": "Los 70 minutos más reveladores de tu vida",
    "The Second C - Competence": "La 2a C - La Competencia",
    "The Third C - Concentration": "La 3a C - La Concentración",
    "The first C - Clarity": "La 1a C - La Claridad",
    "Together is better": "Juntos es mejor",
    "You were born Rich Part 6": "Naciste Rico - Parte 6",
    "You were born rich part 1": "Naciste Rico - Parte 1",
    "You were born rich part 2": "Naciste Rico - Parte 2",
    "You were born rich part 3": "Naciste Rico - Parte 3",
    "You were born rich part 4": "Naciste Rico - Parte 4",
    "You were born rich part 5": "Naciste Rico - Parte 5",
}

LESSONS_EN_TO_PT = {
    "2. Team and Execution - Lecture 2": "2. Equipe e Execução - Aula 2",
    "3. Before the startup - Lecture 3": "3. Antes da Startup - Aula 3",
    "4. Building Product, Talking to users and Growing - Lecture 4": "4. Construir o Produto, Conversar com Usuários e Crescer - Aula 4",
    "5. Competion is for losers Peter Thiel - Lecture 5": "5. A Concorrência é para Perdedores - Peter Thiel - Aula 5",
    "Habit 2 - Begin with the end in mind": "Hábito 2 - Comece com o fim em mente",
    "Habit 5 - Seek first to understand, then to be understood": "Hábito 5 - Procure primeiro entender, depois ser entendido",
    "Habit 7 - Sharpen the saw": "Hábito 7 - Afiar a serra",
    "How to Develop a Trader Mindset Part 1": "Desenvolver a Mentalidade do Trader - Parte 1",
    "How to Develop a Trader Mindset Part 2": "Desenvolver a Mentalidade do Trader - Parte 2",
    "How to Develop a Trader Mindset Part 3": "Desenvolver a Mentalidade do Trader - Parte 3",
    "How to Develop a Trader Mindset Part 4": "Desenvolver a Mentalidade do Trader - Parte 4",
    "How to Develop a Trader Mindset Part 5": "Desenvolver a Mentalidade do Trader - Parte 5",
    "How to build a business that works": "Como construir um negócio que funciona",
    "How to get your ideas to spread": "Como fazer suas ideias se espalharem",
    "How to start a Startup- Lecture 1": "Como iniciar uma Startup - Aula 1",
    "How to train your mind to get what you desire": "Como treinar sua mente para obter o que deseja",
    "If you don't understand people, you don't understand business": "Se você não entende as pessoas, não entende os negócios",
    "Introduction to the 5 levels of Leadership": "Introdução aos 5 níveis de Liderança",
    "Invest in yourself, nurture your body and mind": "Invista em si mesmo, cuide do seu corpo e mente",
    "Keys to becoming a leader": "Chaves para se tornar um líder",
    "Law of Attraction": "Lei da Atração",
    "Les Brown Tells Emotional Stories That Will Leave You in Tears": "Les Brown - Histórias emocionantes que vão te fazer chorar",
    "Level 1 - The position level": "Nível 1 - O nível da posição",
    "Level 2 - The permission level": "Nível 2 - O nível da permissão",
    "Level 3 - The production level": "Nível 3 - O nível da produção",
    "Level 4 - The people development level": "Nível 4 - O nível do desenvolvimento de pessoas",
    "Level 5 - The pinnacle level": "Nível 5 - O nível do pináculo",
    "Secrets of self made millionaires": "Segredos dos milionários autodidatas",
    "The Forth C - Constraints": "O 4º C - As Restrições",
    "The Last Three C's - Continuous Learning, Commitment and Courage": "Os últimos 3 C - Aprendizagem Contínua, Compromisso e Coragem",
    "The Most Eye Opening 70 Minutes of Your life": "Os 70 minutos mais reveladores da sua vida",
    "The Second C - Competence": "O 2º C - A Competência",
    "The Third C - Concentration": "O 3º C - A Concentração",
    "The first C - Clarity": "O 1º C - A Clareza",
    "Together is better": "Juntos é melhor",
    "You were born Rich Part 6": "Você Nasceu Rico - Parte 6",
    "You were born rich part 1": "Você Nasceu Rico - Parte 1",
    "You were born rich part 2": "Você Nasceu Rico - Parte 2",
    "You were born rich part 3": "Você Nasceu Rico - Parte 3",
    "You were born rich part 4": "Você Nasceu Rico - Parte 4",
    "You were born rich part 5": "Você Nasceu Rico - Parte 5",
}

LESSONS_EN_TO_DE = {
    "2. Team and Execution - Lecture 2": "2. Team und Ausführung - Lektion 2",
    "3. Before the startup - Lecture 3": "3. Vor dem Startup - Lektion 3",
    "4. Building Product, Talking to users and Growing - Lecture 4": "4. Produkt aufbauen, mit Nutzern sprechen und wachsen - Lektion 4",
    "5. Competion is for losers Peter Thiel - Lecture 5": "5. Konkurrenz ist für Verlierer - Peter Thiel - Lektion 5",
    "Habit 2 - Begin with the end in mind": "Gewohnheit 2 - Mit dem Ende im Sinn beginnen",
    "Habit 5 - Seek first to understand, then to be understood": "Gewohnheit 5 - Erst verstehen, dann verstanden werden",
    "Habit 7 - Sharpen the saw": "Gewohnheit 7 - Die Säge schärfen",
    "How to Develop a Trader Mindset Part 1": "Trader-Mentalität entwickeln - Teil 1",
    "How to Develop a Trader Mindset Part 2": "Trader-Mentalität entwickeln - Teil 2",
    "How to Develop a Trader Mindset Part 3": "Trader-Mentalität entwickeln - Teil 3",
    "How to Develop a Trader Mindset Part 4": "Trader-Mentalität entwickeln - Teil 4",
    "How to Develop a Trader Mindset Part 5": "Trader-Mentalität entwickeln - Teil 5",
    "How to build a business that works": "Wie man ein funktionierendes Unternehmen aufbaut",
    "How to get your ideas to spread": "Wie Sie Ihre Ideen verbreiten",
    "How to start a Startup- Lecture 1": "Wie man ein Startup gründet - Lektion 1",
    "How to train your mind to get what you desire": "Wie man seinen Geist trainiert, um zu bekommen, was man begehrt",
    "If you don't understand people, you don't understand business": "Wer Menschen nicht versteht, versteht kein Geschäft",
    "Introduction to the 5 levels of Leadership": "Einführung in die 5 Führungsebenen",
    "Invest in yourself, nurture your body and mind": "Investiere in dich selbst, pflege Körper und Geist",
    "Keys to becoming a leader": "Schlüssel zum Führen",
    "Law of Attraction": "Das Gesetz der Anziehung",
    "Les Brown Tells Emotional Stories That Will Leave You in Tears": "Les Brown - Bewegende Geschichten, die dich zu Tränen rühren",
    "Level 1 - The position level": "Ebene 1 - Die Positionsebene",
    "Level 2 - The permission level": "Ebene 2 - Die Erlaubnisebene",
    "Level 3 - The production level": "Ebene 3 - Die Produktionsebene",
    "Level 4 - The people development level": "Ebene 4 - Die Personalentwicklungsebene",
    "Level 5 - The pinnacle level": "Ebene 5 - Die Gipfelebene",
    "Secrets of self made millionaires": "Geheimnisse der Selfmade-Millionäre",
    "The Forth C - Constraints": "Das 4. K - Einschränkungen",
    "The Last Three C's - Continuous Learning, Commitment and Courage": "Die letzten 3 K - Kontinuierliches Lernen, Engagement und Mut",
    "The Most Eye Opening 70 Minutes of Your life": "Die aufschlussreichsten 70 Minuten Ihres Lebens",
    "The Second C - Competence": "Das 2. K - Kompetenz",
    "The Third C - Concentration": "Das 3. K - Konzentration",
    "The first C - Clarity": "Das 1. K - Klarheit",
    "Together is better": "Zusammen ist es besser",
    "You were born Rich Part 6": "Du wurdest reich geboren - Teil 6",
    "You were born rich part 1": "Du wurdest reich geboren - Teil 1",
    "You were born rich part 2": "Du wurdest reich geboren - Teil 2",
    "You were born rich part 3": "Du wurdest reich geboren - Teil 3",
    "You were born rich part 4": "Du wurdest reich geboren - Teil 4",
    "You were born rich part 5": "Du wurdest reich geboren - Teil 5",
}

# ─── Injection dans les fichiers strings.*.json ───────────────────────────────
LOCALES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'static', 'locales')

LANG_MAP = {
    'en': (COURSES_FR_TO_EN, LESSONS_EN_TO_FR),    # clé FR → valeur EN ; leçons EN titre → FR
    'es': (COURSES_FR_TO_ES, LESSONS_EN_TO_ES),
    'pt': (COURSES_FR_TO_PT, LESSONS_EN_TO_PT),
    'de': (COURSES_FR_TO_DE, LESSONS_EN_TO_DE),
}

# Note : pour EN, les titres cours sont stockés EN ANGLAIS en DB (les noms propres)
# donc on crée la règle inverse : le titre EN stocké → traduction EN (identique / corrigé)
# ET on crée : titre FR traduit → titre anglais POUR les cours dont le titre FR est déjà en anglais
# La logique : strings.en.json contient { "clé_FR": "valeur_EN" }
# Ici les "clés FR" des cours sont les titres originaux (parfois déjà en EN dans la DB)

for lang, (course_dict, lesson_dict) in LANG_MAP.items():
    fpath = os.path.join(LOCALES_DIR, f'strings.{lang}.json')
    if not os.path.exists(fpath):
        print(f'⚠️  Fichier manquant : {fpath}')
        continue

    with open(fpath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    added = 0
    # Titres cours
    for fr_key, translated in course_dict.items():
        if fr_key not in data:
            data[fr_key] = translated
            added += 1
        # Mettre à jour si déjà là
        else:
            data[fr_key] = translated

    # Titres leçons
    for en_key, fr_val in lesson_dict.items():
        if lang == 'en':
            # Pour EN : les leçons sont stockées EN anglais en DB.
            # Le système i18n traduit "clé_FR" → "valeur_EN"
            # Mais ces leçons sont déjà en anglais dans la DB !
            # On doit donc avoir : "titre_EN_db" → "titre_FR_affiché"  dans strings.fr
            # Ce n'est pas le bon sens pour strings.en
            # Pour EN on ne fait rien sur les leçons (elles sont déjà en EN en DB)
            pass
        else:
            # Pour ES/PT/DE : "titre_EN_db" → "titre_traduit"
            if en_key not in data:
                data[en_key] = fr_val
                added += 1
            else:
                data[en_key] = fr_val

    # Trier alphabétiquement
    data = dict(sorted(data.items()))

    with open(fpath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'✅ {lang}: {added} nouvelles entrées ajoutées → {fpath}')

# ─── Créer strings.fr.json pour les titres anglais stockés en DB ──────────────
# Les leçons anglaises doivent aussi être traduites quand on est en FR
FR_LOCALE_PATH = os.path.join(LOCALES_DIR, 'strings.fr.json')
fr_data = {}
if os.path.exists(FR_LOCALE_PATH):
    with open(FR_LOCALE_PATH, 'r', encoding='utf-8') as f:
        fr_data = json.load(f)

fr_added = 0
for en_key, fr_val in LESSONS_EN_TO_FR.items():
    fr_data[en_key] = fr_val
    fr_added += 1

fr_data = dict(sorted(fr_data.items()))
with open(FR_LOCALE_PATH, 'w', encoding='utf-8') as f:
    json.dump(fr_data, f, ensure_ascii=False, indent=2)
print(f'✅ fr: {fr_added} titres de leçons anglais → français ajoutés')

print('\n✅ Toutes les traductions campus injectées dans les fichiers strings.*.json')

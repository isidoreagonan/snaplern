import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Utilisation de la clé admin pour contourner le RLS

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Veuillez configurer VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Remplace ce chemin par le chemin exact de ton fichier CSV
const CSV_FILE_PATH = "C:/Users/isido/Downloads/query-results-export-2026-06-15_08-42-34.csv";

// Ordre d'insertion crucial pour respecter les clés étrangères
const TABLE_ORDER = [
  'profiles',
  'user_roles',
  'subscriptions',
  'learning_sessions',
  'flashcards',
  'quiz_attempts',
  'oracle_chats',
  'mindmaps',
  'exam_sessions',
  'session_exercises',
  'exercise_attempts',
  'exercise_solves'
];

async function importData() {
  console.log("Lecture du fichier CSV...");
  try {
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    
    // Le fichier contient un JSON gigantesque dans la première colonne de la deuxième ligne
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    
    if (records.length === 0) {
      console.error("Le fichier CSV est vide.");
      return;
    }

    const row = records[0];
    const rawData = Object.values(row)[0]; // Prendre la valeur de la première (et unique) colonne
    const dbData = JSON.parse(rawData);

    console.log("Données JSON analysées avec succès !");

    for (const tableName of TABLE_ORDER) {
      const rows = dbData[tableName];
      
      if (!rows || rows.length === 0) {
        console.log(`Table ${tableName}: 0 ligne à importer.`);
        continue;
      }

      console.log(`Importation de ${rows.length} lignes dans la table '${tableName}'...`);
      
      // Insertion par lots (batch) au cas où il y a beaucoup de données
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from(tableName).insert(chunk);
        
        if (error) {
          console.error(`Erreur lors de l'insertion dans ${tableName}:`, error.message);
          // On continue quand même avec les autres tables
        }
      }
      console.log(`✓ Table '${tableName}' terminée.`);
    }

    console.log("\n✅ Importation totale terminée avec succès !");

  } catch (error) {
    console.error("Erreur fatale:", error);
  }
}

importData();

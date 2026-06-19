#!/usr/bin/env python3
"""
Food Image Batch Processor
Processes a folder of food images, extracts ingredients/nutrition using available tools.
Supports weak labels and manual correction workflows.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime
import sqlite3

@dataclass
class FoodEntry:
    image_path: str
    timestamp: str
    extracted_ingredients: List[str]
    manual_ingredients: List[str] = None
    confidence: float = 0.0
    nutrition_estimate: Dict = None
    health_outcomes: Dict = None
    
    def to_dict(self):
        return asdict(self)

class FoodImageProcessor:
    def __init__(self, db_path: str = "food_health.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        """Initialize SQLite database for food entries."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Food entries table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS food_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_path TEXT NOT NULL,
                timestamp TEXT,
                extracted_ingredients TEXT,
                manual_ingredients TEXT,
                confidence REAL,
                nutrition_estimate TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Health outcomes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS health_outcomes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entry_id INTEGER,
                outcome_type TEXT,  -- 'bm', 'energy', 'symptom', etc.
                severity INTEGER,   -- 1-5 scale
                timestamp TEXT,
                notes TEXT,
                FOREIGN KEY (entry_id) REFERENCES food_entries(id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def process_folder(self, folder_path: str, pattern: str = "*.jpg") -> List[FoodEntry]:
        """Process all images in a folder matching pattern."""
        folder = Path(folder_path)
        entries = []
        
        for image_file in folder.glob(pattern):
            entry = self.process_single_image(str(image_file))
            entries.append(entry)
        
        return entries
    
    def process_single_image(self, image_path: str) -> FoodEntry:
        """Process a single food image."""
        # Get file timestamp
        stat = os.stat(image_path)
        timestamp = datetime.fromtimestamp(stat.st_mtime).isoformat()
        
        entry = FoodEntry(
            image_path=image_path,
            timestamp=timestamp,
            extracted_ingredients=[],
            manual_ingredients=[],
            confidence=0.0
        )
        
        return entry
    
    def save_entry(self, entry: FoodEntry) -> int:
        """Save entry to database, return entry ID."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO food_entries 
            (image_path, timestamp, extracted_ingredients, manual_ingredients, confidence, nutrition_estimate)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            entry.image_path,
            entry.timestamp,
            json.dumps(entry.extracted_ingredients),
            json.dumps(entry.manual_ingredients or []),
            entry.confidence,
            json.dumps(entry.nutrition_estimate or {})
        ))
        
        entry_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return entry_id
    
    def add_health_outcome(self, entry_id: int, outcome_type: str, 
                          severity: int, timestamp: str, notes: str = ""):
        """Add a health outcome linked to a food entry."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO health_outcomes (entry_id, outcome_type, severity, timestamp, notes)
            VALUES (?, ?, ?, ?, ?)
        ''', (entry_id, outcome_type, severity, timestamp, notes))
        
        conn.commit()
        conn.close()
    
    def get_entries_for_analysis(self, hours_window: int = 24) -> List[Dict]:
        """Get entries with health outcomes for correlation analysis."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT fe.*, ho.outcome_type, ho.severity, ho.timestamp as outcome_time
            FROM food_entries fe
            LEFT JOIN health_outcomes ho ON fe.id = ho.entry_id
            WHERE ho.id IS NOT NULL
            ORDER BY fe.timestamp
        ''')
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row[0],
                'image_path': row[1],
                'food_time': row[2],
                'ingredients': json.loads(row[3] or '[]'),
                'outcome_type': row[8],
                'severity': row[9],
                'outcome_time': row[10]
            })
        
        conn.close()
        return results

def main():
    parser = argparse.ArgumentParser(description='Process food images for health analysis')
    parser.add_argument('folder', help='Folder containing food images')
    parser.add_argument('--pattern', default='*.jpg', help='Image file pattern')
    parser.add_argument('--db', default='food_health.db', help='Database path')
    parser.add_argument('--dry-run', action='store_true', help='Process without saving')
    
    args = parser.parse_args()
    
    processor = FoodImageProcessor(args.db)
    entries = processor.process_folder(args.folder, args.pattern)
    
    print(f"Found {len(entries)} images in {args.folder}")
    
    for entry in entries:
        print(f"\n📷 {Path(entry.image_path).name}")
        print(f"   Time: {entry.timestamp}")
        
        if not args.dry_run:
            entry_id = processor.save_entry(entry)
            print(f"   Saved as entry #{entry_id}")
    
    print(f"\n✅ Processed {len(entries)} images")
    print(f"📊 Database: {args.db}")

if __name__ == '__main__':
    main()

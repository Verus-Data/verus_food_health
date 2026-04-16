#!/usr/bin/env python3
"""
Simple web dashboard for food-health tracker
Flask-based UI for viewing food entries and health correlations
"""

import sqlite3
import json
from flask import Flask, render_template, jsonify, request
from datetime import datetime, timedelta
from pathlib import Path

app = Flask(__name__)
DB_PATH = "food_health.db"

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/api/entries')
def get_entries():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, image_path, timestamp, manual_ingredients, extracted_ingredients, confidence
        FROM food_entries
        ORDER BY timestamp DESC
        LIMIT 100
    ''')
    
    entries = []
    for row in cursor.fetchall():
        entries.append({
            'id': row[0],
            'image': Path(row[1]).name,
            'timestamp': row[2],
            'ingredients': json.loads(row[3] or row[4] or '[]'),
            'confidence': row[5]
        })
    
    conn.close()
    return jsonify(entries)

@app.route('/api/stats')
def get_stats():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Basic counts
    cursor.execute('SELECT COUNT(*) FROM food_entries')
    total_meals = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM health_outcomes')
    total_outcomes = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(DISTINCT entry_id) FROM health_outcomes')
    linked_meals = cursor.fetchone()[0]
    
    # Recent entries (last 7 days)
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    cursor.execute('SELECT COUNT(*) FROM food_entries WHERE timestamp > ?', (week_ago,))
    recent_meals = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'total_meals': total_meals,
        'total_outcomes': total_outcomes,
        'linked_meals': linked_meals,
        'recent_meals': recent_meals
    })

@app.route('/api/outcomes')
def get_outcomes():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT outcome_type, severity, timestamp
        FROM health_outcomes
        ORDER BY timestamp DESC
        LIMIT 50
    ''')
    
    outcomes = []
    for row in cursor.fetchall():
        outcomes.append({
            'type': row[0],
            'severity': row[1],
            'timestamp': row[2]
        })
    
    conn.close()
    return jsonify(outcomes)

if __name__ == '__main__':
    print("🍽️  Food Health Dashboard")
    print("Open: http://localhost:5000")
    app.run(debug=True, port=5000)

#!/usr/bin/env python3
"""
Health Outcome Correlator
Correlates food intake with health outcomes (bowel movements, energy, symptoms)
Identifies potential trigger foods and patterns.
"""

import sqlite3
import json
import argparse
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import statistics

class HealthCorrelator:
    def __init__(self, db_path: str = "food_health.db"):
        self.db_path = db_path
    
    def get_correlations(self, hours_window: int = 24) -> Dict:
        """Analyze correlations between foods and health outcomes."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get all food entries with their outcomes
        cursor.execute('''
            SELECT fe.id, fe.timestamp, fe.manual_ingredients, fe.extracted_ingredients,
                   ho.outcome_type, ho.severity, ho.timestamp as outcome_time
            FROM food_entries fe
            JOIN health_outcomes ho ON fe.id = ho.entry_id
            ORDER BY fe.timestamp
        ''')
        
        # Group by ingredient and outcome type
        ingredient_outcomes = defaultdict(lambda: defaultdict(list))
        
        for row in cursor.fetchall():
            entry_id, food_time, manual_ing, extracted_ing, outcome_type, severity, outcome_time = row
            
            # Parse ingredients (prefer manual over extracted)
            ingredients = json.loads(manual_ing or '[]') or json.loads(extracted_ing or '[]')
            
            # Check if outcome is within time window
            try:
                food_dt = datetime.fromisoformat(food_time.replace('Z', '+00:00'))
                outcome_dt = datetime.fromisoformat(outcome_time.replace('Z', '+00:00'))
                time_diff = (outcome_dt - food_dt).total_seconds() / 3600  # hours
                
                if 0 <= time_diff <= hours_window:
                    for ingredient in ingredients:
                        ingredient_outcomes[ingredient.lower()][outcome_type].append({
                            'severity': severity,
                            'hours_after': time_diff,
                            'entry_id': entry_id
                        })
            except Exception as e:
                print(f"Warning: Could not parse timestamps: {e}")
                continue
        
        conn.close()
        
        # Calculate statistics
        correlations = {}
        for ingredient, outcomes in ingredient_outcomes.items():
            correlations[ingredient] = {}
            for outcome_type, records in outcomes.items():
                severities = [r['severity'] for r in records]
                correlations[ingredient][outcome_type] = {
                    'count': len(severities),
                    'avg_severity': statistics.mean(severities) if severities else 0,
                    'max_severity': max(severities) if severities else 0,
                    'avg_hours_after': statistics.mean([r['hours_after'] for r in records]) if records else 0
                }
        
        return correlations
    
    def get_trigger_foods(self, outcome_type: str = 'bm', min_count: int = 3) -> List[Tuple[str, Dict]]:
        """Get foods most associated with negative outcomes."""
        correlations = self.get_correlations()
        
        triggers = []
        for ingredient, outcomes in correlations.items():
            if outcome_type in outcomes:
                data = outcomes[outcome_type]
                if data['count'] >= min_count:
                    triggers.append((ingredient, data))
        
        # Sort by average severity (higher = more problematic)
        triggers.sort(key=lambda x: x[1]['avg_severity'], reverse=True)
        return triggers
    
    def generate_report(self, output_file: str = None):
        """Generate a health correlation report."""
        report_lines = []
        report_lines.append("=" * 60)
        report_lines.append("FOOD-HEALTH CORRELATION REPORT")
        report_lines.append(f"Generated: {datetime.now().isoformat()}")
        report_lines.append("=" * 60)
        
        # Bowel movement triggers
        report_lines.append("\n🚽 POTENTIAL BOWEL MOVEMENT TRIGGERS")
        report_lines.append("-" * 40)
        
        bm_triggers = self.get_trigger_foods('bm', min_count=2)
        if bm_triggers:
            for ingredient, data in bm_triggers[:10]:  # Top 10
                report_lines.append(f"  {ingredient:20} | Count: {data['count']:3} | Avg Severity: {data['avg_severity']:.2f}")
        else:
            report_lines.append("  Not enough data yet. Log more meals and outcomes.")
        
        # Energy level impacts
        report_lines.append("\n⚡ ENERGY LEVEL IMPACTS")
        report_lines.append("-" * 40)
        
        energy_triggers = self.get_trigger_foods('energy', min_count=2)
        if energy_triggers:
            for ingredient, data in energy_triggers[:10]:
                report_lines.append(f"  {ingredient:20} | Count: {data['count']:3} | Avg Impact: {data['avg_severity']:.2f}")
        else:
            report_lines.append("  Not enough data yet.")
        
        # Summary stats
        report_lines.append("\n📊 SUMMARY")
        report_lines.append("-" * 40)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM food_entries')
        total_meals = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM health_outcomes')
        total_outcomes = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(DISTINCT entry_id) FROM health_outcomes')
        linked_meals = cursor.fetchone()[0]
        
        conn.close()
        
        report_lines.append(f"  Total meals logged:     {total_meals}")
        report_lines.append(f"  Total outcomes logged:  {total_outcomes}")
        report_lines.append(f"  Meals with outcomes:    {linked_meals}")
        
        report = "\n".join(report_lines)
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(report)
            print(f"Report saved to: {output_file}")
        
        return report

def main():
    parser = argparse.ArgumentParser(description='Correlate food with health outcomes')
    parser.add_argument('--db', default='food_health.db', help='Database path')
    parser.add_argument('--window', type=int, default=24, help='Hours window for correlation')
    parser.add_argument('--report', action='store_true', help='Generate full report')
    parser.add_argument('--output', help='Output file for report')
    
    args = parser.parse_args()
    
    correlator = HealthCorrelator(args.db)
    
    if args.report:
        report = correlator.generate_report(args.output)
        print(report)
    else:
        # Quick summary
        print("\n📊 Food-Health Correlations")
        print("-" * 40)
        
        correlations = correlator.get_correlations(args.window)
        print(f"Analyzed {len(correlations)} unique ingredients\n")
        
        # Show top correlations
        print("Top correlated ingredients:")
        sorted_ingredients = sorted(
            correlations.items(),
            key=lambda x: sum(d['count'] for d in x[1].values()),
            reverse=True
        )[:10]
        
        for ingredient, outcomes in sorted_ingredients:
            total = sum(d['count'] for d in outcomes.values())
            outcome_types = ', '.join(outcomes.keys())
            print(f"  {ingredient:20} ({total} correlations) - {outcome_types}")

if __name__ == '__main__':
    main()

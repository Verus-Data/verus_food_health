#!/usr/bin/env python3
"""
Ingredient Extractor
Extract ingredients from food images using available vision models and APIs.
Supports manual correction workflow.
"""

import argparse
import json
from pathlib import Path
from typing import List, Dict, Optional

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

class IngredientExtractor:
    def __init__(self, method: str = "manual"):
        self.method = method
    
    def extract_from_image(self, image_path: str) -> Dict:
        """Extract ingredients from a food image."""
        result = {
            'image_path': image_path,
            'method': self.method,
            'ingredients': [],
            'confidence': 0.0,
            'raw_output': None
        }
        
        if self.method == "manual":
            # Placeholder for manual entry
            result['ingredients'] = []
            result['confidence'] = 1.0
            result['note'] = 'Manual entry required - no AI extraction'
            
        elif self.method == "clarifai":
            # Would integrate Clarifai food model
            result['note'] = 'Clarifai integration not implemented'
            
        elif self.method == "edamam":
            # Would integrate Edamam image analysis
            result['note'] = 'Edamam integration not implemented'
            
        elif self.method == "huggingface":
            # Would run local Hugging Face model
            result['note'] = 'Hugging Face local model not implemented'
            
        return result
    
    def interactive_label(self, image_path: str, previous_ingredients: List[str] = None) -> List[str]:
        """Interactive CLI for manual ingredient labeling."""
        print(f"\n📷 Processing: {Path(image_path).name}")
        
        if previous_ingredients:
            print(f"   Previous ingredients: {', '.join(previous_ingredients)}")
        
        ingredients = []
        print("   Enter ingredients (one per line, blank to finish):")
        
        while True:
            ingredient = input("   > ").strip().lower()
            if not ingredient:
                break
            ingredients.append(ingredient)
        
        return ingredients
    
    def batch_process(self, folder_path: str, pattern: str = "*.jpg") -> List[Dict]:
        """Process all images in a folder."""
        folder = Path(folder_path)
        results = []
        
        for image_file in folder.glob(pattern):
            result = self.extract_from_image(str(image_file))
            results.append(result)
        
        return results

def suggest_ingredients(food_type: str) -> List[str]:
    """Suggest common ingredients based on food type."""
    suggestions = {
        'salad': ['lettuce', 'tomato', 'cucumber', 'dressing', 'onion', 'carrot'],
        'pizza': ['dough', 'tomato sauce', 'cheese', 'pepperoni', 'olive oil'],
        'burger': ['beef', 'bun', 'lettuce', 'tomato', 'onion', 'pickles', 'mayonnaise'],
        'sandwich': ['bread', 'meat', 'cheese', 'lettuce', 'tomato', 'mustard'],
        'pasta': ['pasta', 'tomato sauce', 'garlic', 'olive oil', 'parmesan', 'basil'],
        'sushi': ['rice', 'nori', 'fish', 'wasabi', 'soy sauce', 'avocado'],
        'stir fry': ['rice', 'vegetables', 'soy sauce', 'garlic', 'ginger', 'oil'],
        'breakfast': ['eggs', 'bacon', 'toast', 'butter', 'coffee', 'fruit'],
        'smoothie': ['fruit', 'yogurt', 'milk', 'protein powder', 'spinach', 'banana'],
        'default': ['protein', 'vegetables', 'carbohydrates', 'fats', 'seasoning']
    }
    
    return suggestions.get(food_type.lower(), suggestions['default'])

def main():
    parser = argparse.ArgumentParser(description='Extract ingredients from food images')
    parser.add_argument('folder', help='Folder containing food images')
    parser.add_argument('--method', choices=['manual', 'clarifai', 'edamam', 'huggingface'],
                       default='manual', help='Extraction method')
    parser.add_argument('--interactive', action='store_true', help='Interactive labeling mode')
    parser.add_argument('--output', help='Output JSON file')
    
    args = parser.parse_args()
    
    extractor = IngredientExtractor(args.method)
    
    if args.interactive:
        print("\n🍽️  Interactive Food Labeling")
        print("-" * 40)
        
        folder = Path(args.folder)
        results = []
        
        for image_file in folder.glob("*.jpg"):
            ingredients = extractor.interactive_label(str(image_file))
            results.append({
                'image': str(image_file),
                'ingredients': ingredients
            })
            print(f"   Saved: {len(ingredients)} ingredients\n")
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\n✅ Results saved to: {args.output}")
    else:
        results = extractor.batch_process(args.folder)
        
        print(f"\n🍽️  Ingredient Extraction Results")
        print("-" * 40)
        
        for result in results:
            print(f"\n📷 {Path(result['image_path']).name}")
            print(f"   Method: {result['method']}")
            print(f"   Ingredients: {', '.join(result['ingredients']) if result['ingredients'] else 'None extracted'}")
            if result.get('note'):
                print(f"   Note: {result['note']}")
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\n✅ Results saved to: {args.output}")

if __name__ == '__main__':
    main()

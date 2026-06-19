# Product Requirements Document (PRD) - Gut Health Tracker

## Problem Statement
Individuals suffering from Irritable Bowel Syndrome (IBS) and other gut-related conditions often struggle to identify food triggers that cause symptoms. Current methods (food diaries, apps) are manual, fragmented, and lack AI-assisted correlation analysis.

## Solution Overview
A full-stack web application that enables users to:
- Log meals via photo upload or manual entry
- Track bowel movements using Bristol Scale 1-7
- View timeline of entries with visual correlations
- Receive AI-generated ingredient predictions with human-in-the-loop confirmation
- Discover personalized trigger foods via statistical analysis (z-test)
- Export data for medical review

## User Stories
As an IBS sufferer, I want to:
- Take a photo of my meal and have ingredients auto-suggested → so I don’t need to type everything
- Rate my bowel movement on a scale → so I can track severity over time
- See which foods correlate with bad days → so I can avoid them
- Get weekly trend reports → so I can share progress with my doctor
- Keep my data private with anonymous UUIDs → so I feel safe sharing sensitive health info

## Feature Phases
### V0: Scaffold
- FastAPI + Next.js base with SQLite
- Basic CRUD for FoodEntry, HealthOutcome
- Timeline view with date filters
- Simple correlation heatmap

### V1: Real DB + Auth
- Migrate to Prisma schema with User, Ingredient, PersonalTrigger models
- Implement NextAuth for user sessions
- Add export API endpoint

### V2: AI Ingredient Prediction
- Integrate HuggingFace Food-101 model for image classification
- Human-in-the-loop confirmation UI for predicted ingredients
- Store confirmed ingredients in database

### V3: Personalized Learning
- Trigger Analyzer microservice using scipy z-test
- Predictions API for real-time trigger suggestions
- DailyTrend model for longitudinal tracking
- S3-ready photo storage structure

## Success Metrics
- 95% accurate ingredient tagging (manual first, AI as suggestion)
- Correlation detection within 24-hour lookback window
- <2s response time for prediction endpoints
- Zero PII stored (UUID-based anonymous users)

DISEASE SCAN PACKAGE

Files included: 11 critical files
- 6 core service files
- 2 ML model files
- 3 test files

NEXT STEPS:
1. Copy backend folder to your duplicate location
2. Run: pip install -r requirements.txt
3. Create .env with GROQ_API_KEY
4. Start: python -m server.server
5. Test: curl -X POST -F 'image=@leaf.jpg' http://localhost:8000/disease


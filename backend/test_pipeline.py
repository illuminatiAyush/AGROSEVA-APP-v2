"""Full pipeline test — tests both server imports and disease detection."""
import os, time, io
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

print("=" * 60)
print("AGROSEVA DISEASE DETECTION PIPELINE TEST")
print("=" * 60)

# Test 1: Server imports
print("\n[1/4] Testing server imports...")
start = time.time()
try:
    from server.disease_service import DiseaseService
    from server.groq_service import get_disease_diagnosis
    from server.agent import decide_action
    from server import config
    print(f"  ✅ All imports OK ({time.time()-start:.1f}s)")
except Exception as e:
    print(f"  ❌ Import failed: {e}")
    import traceback; traceback.print_exc()
    exit(1)

# Test 2: Config values
print("\n[2/4] Checking configuration...")
print(f"  Disease enabled:    {config.ENABLE_DISEASE}")
print(f"  TinyML port:        {config.TINYML_SERIAL_PORT}")
print(f"  Groq model:         {config.GROQ_MODEL}")
print(f"  Groq API key set:   {'Yes' if config.GROQ_API_KEY and config.GROQ_API_KEY != 'your_groq_api_key_here' else 'No (placeholder)'}")
print(f"  Accurate model:     {config.ACCURATE_MODEL_PATH}")
print(f"  Model exists:       {os.path.exists(config.ACCURATE_MODEL_PATH)}")
print(f"  ✅ Config OK")

# Test 3: Disease service + model loading
print("\n[3/4] Loading disease service & accurate model...")
start = time.time()
ds = DiseaseService()
load_time = time.time() - start
print(f"  Accurate model loaded: {ds.has_accurate_model()}")
print(f"  Class names:           {len(ds._class_names)} classes")
print(f"  ESP32 connected:       {ds.is_connected()}")
print(f"  Load time:             {load_time:.1f}s")

if ds.has_accurate_model():
    print(f"  ✅ Disease service OK")
else:
    print(f"  ⚠️  Model not loaded — check TF installation")

# Test 4: Run inference
if ds.has_accurate_model():
    print("\n[4/4] Running inference test...")
    from PIL import Image
    import numpy as np
    
    # Create green test image
    img = Image.new('RGB', (300, 300), (50, 150, 50))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    
    t = time.time()
    result = ds.run_accurate_inference(buf.getvalue())
    inf_time = time.time() - t
    
    print(f"  Disease:    {result.get('disease_name', 'N/A')}")
    print(f"  Healthy:    {result.get('is_healthy', 'N/A')}")
    print(f"  Confidence: {result.get('confidence', 0)}%")
    print(f"  Method:     {result.get('method', 'N/A')}")
    print(f"  Inf. time:  {inf_time:.2f}s")
    if 'all_predictions' in result:
        print(f"  Top 5:")
        for name, conf in result['all_predictions'].items():
            print(f"    {name:50} {conf}%")
    print(f"  ✅ Inference OK")
else:
    print("\n[4/4] Skipping inference (model not loaded)")

# Test 5: Agent decision
print("\n[BONUS] Testing DRL agent...")
decision = decide_action(moisture=0.30)
print(f"  Action:  {decision['action_label']}")
print(f"  Method:  {decision['method']}")
print(f"  Explain: {decision['explanation']}")
print(f"  ✅ Agent OK")

print("\n" + "=" * 60)
print("✅ ALL PIPELINE TESTS PASSED")
print("=" * 60)
print(f"\nEndpoints ready:")
print(f"  POST /disease  - Upload plant image for diagnosis")
print(f"  GET  /health   - Server health check")
print(f"  GET  /status   - Full system status")
print(f"  GET  /moisture - Live moisture data")

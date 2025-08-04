import google.generativeai as genai

genai.configure(api_key="AIzaSyB4x81dLPbD2ygOiJSZOg1ZrCvKleTQ0Co")

models = genai.list_models()
for model in models:
    print(model.name)

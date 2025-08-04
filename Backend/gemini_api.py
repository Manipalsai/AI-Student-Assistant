import os
import google.generativeai as genai

# Configure the API key
genai.configure(api_key="AIzaSyDbl2KjdZOzRSmo1SplW5oKsNaq6u4z0U4")  # Replace with actual key

# Use raw string to avoid path issues
file_path = r"C:\Users\manip\Desktop\Special_Project\sample.pdf"

# Check if the file exists
if not os.path.exists(file_path):
    print(f"Error: Sample file not found at {file_path}")
    exit()

# Read the content from the sample file
with open("sample.txt", "r", encoding="latin1") as file:
    content = file.read()

# Create the model instance
model = genai.GenerativeModel("gemini-1.5-pro-latest")

# Generate MCQs using the file content
prompt = f"Generate multiple-choice questions (MCQs) based on the following text:\n\n{content}"
response = model.generate_content(prompt)

# Print the generated MCQs
print(response.text)

def generate_text(prompt):
    response = model.generate_content(prompt)
    return response.text


import openai
import Config as CF
import json
import re


class QuestionGenerator:

    @staticmethod
    def generate_questions(role: str, n_questions: int = 5):
        prompt = f"""
        Generate {n_questions} customized interview questions for a candidate applying as a '{role}'.
        Return ONLY a JSON array of strings, with no additional text, no numbering, no formatting.
        Example format: ["Question 1", "Question 2", "Question 3"]
        """
        try:
            response = openai.ChatCompletion.create(
                model=CF.Config.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            text = response.choices[0].message.content.strip()
            
            # Try to parse as JSON
            try:
                questions = json.loads(text)
                if isinstance(questions, list):
                    return questions
            except:
                # If not JSON, try to extract questions using regex
                pass
            
            # Fallback: extract questions from text
            questions = []
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                # Remove numbering and quotes
                line = re.sub(r'^\d+[\.\)]\s*', '', line)
                line = line.strip('"').strip("'")
                if line and len(line) > 10:
                    questions.append(line)
            
            return questions[:n_questions]
            
        except Exception as e:
            print(f"Error generating questions: {e}")
            # Return fallback questions
            return [
                f"What experience do you have with {role}?",
                f"Describe a challenging project you worked on as a {role}.",
                f"What are the key skills required for a {role}?"
            ][:n_questions]
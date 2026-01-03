# import openai
# import Config as CF
#
#
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
#
# class QuestionGenerator:
#
#     @staticmethod
#     def generate_questions(role: str, n_questions: int = 5):
#         prompt = f"""
#         Generate {n_questions} customized interview questions for a candidate applying as a '{role}'.
#         Format as a JSON array of questions.
#         """
#         response = openai.ChatCompletion.create(
#             model=CF.Config.LLM_MODEL,
#             messages=[{"role": "user", "content": prompt}],
#             temperature=0.7
#         )
#         text = response.choices[0].message.content
#         return text
import os
import openai
import Config as CF

openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("Missing OPENAI_API_KEY environment variable")

class QuestionGenerator:
    @staticmethod
    def generate_questions(role: str, n_questions: int = 5):
        prompt = f"""
        Generate {n_questions} customized interview questions for a candidate applying as a '{role}'.
        Format as a JSON array of questions.
        """
        response = openai.ChatCompletion.create(
            model=CF.Config.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        return response.choices[0].message.content

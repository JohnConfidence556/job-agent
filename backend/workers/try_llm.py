from pydantic import BaseModel

from app.llm import complete_json


class Greeting(BaseModel):
    message: str
    language: str


result = complete_json(
    task="smoke_test",
    system="You are a friendly assistant.",
    user="Greet a Nigerian job seeker in one short sentence.",
    schema=Greeting,
)
print(result)
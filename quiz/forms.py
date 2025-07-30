from django import forms
from django.contrib.auth.models import User
from .models import UserProfile, Question, QuizResult

class UserLoginForm(forms.Form):
    name = forms.CharField(max_length=100, label="Your Name")
    matric = forms.CharField(max_length=30, label="Matric Number")
    department = forms.ModelChoiceField(queryset=None, label="Department")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from .models import Department
        self.fields['department'].queryset = Department.objects.all()

class QuizAnswerForm(forms.Form):
    question_id = forms.IntegerField(widget=forms.HiddenInput())
    selected_option = forms.ChoiceField(widget=forms.RadioSelect, choices=())

    def __init__(self, question, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['question_id'].initial = question.id
        self.fields['selected_option'].choices = [
            (question.option1, question.option1),
            (question.option2, question.option2),
            (question.option3, question.option3),
            (question.option4, question.option4),
        ]

class ContactForm(forms.Form):
    name = forms.CharField(max_length=100, label="Your Name")
    email = forms.EmailField(label="Your Email")
    message = forms.CharField(widget=forms.Textarea, label="Your Message")

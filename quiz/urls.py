from django.urls import path
from . import views  # Import views.py

urlpatterns = [
    path('', views.index, name='index'),
    path('api/questions/', views.api_questions, name='api_questions'),
    path('api/save_result/', views.api_save_result, name='api_save_result'),
    path('api/contact/', views.api_contact_message, name='api_contact_message'),
    path('api/leaderboard/', views.api_leaderboard, name='api_leaderboard'),
    # Optionally keep these if you want to support server-side quiz as well:
    path('quiz/login/', views.quiz_login, name='quiz_login'),
    path('quiz/question/', views.quiz_question, name='quiz_question'),
    path('quiz/result/', views.quiz_result, name='quiz_result'),
]

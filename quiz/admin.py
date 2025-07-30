from .models import ContactMessage
from django.contrib import admin
from .models import Department, UserProfile, Question, QuizResult, CompetitionEntry
@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "submitted_at")
    search_fields = ("name", "email", "message")

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "matric", "department")
    search_fields = ("user__username", "matric")
    list_filter = ("department",)

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "department", "question_type", "answer")
    search_fields = ("text", "answer")
    list_filter = ("department", "question_type")

@admin.register(QuizResult)
class QuizResultAdmin(admin.ModelAdmin):
    list_display = ("user", "score", "total", "percentage", "date_taken", "is_competition")
    search_fields = ("user__user__username", "user__matric")
    list_filter = ("is_competition", "date_taken")

@admin.register(CompetitionEntry)
class CompetitionEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "timestamp")
    search_fields = ("user__user__username", "user__matric")
    list_filter = ("timestamp",)

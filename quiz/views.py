from django.db.models import Q
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.http import require_GET
from .models import ContactMessage
from django.views.decorators.http import require_POST
from django.shortcuts import render, redirect
from django.contrib import messages
from .models import Department, UserProfile, Question, QuizResult
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json


# API endpoint: Get all quiz results (optionally filtered by field)
@require_GET
def api_leaderboard(request):
    field = request.GET.get('field')
    results = QuizResult.objects.select_related('user__user', 'user__department').order_by('-percentage', '-id')
    if field and field != 'all':
        results = results.filter(user__department__name=field)
    leaderboard = []
    for res in results:
        leaderboard.append({
            'name': res.user.user.first_name,
            'matric': res.user.matric,
            'field': res.user.department.name if res.user.department else '',
            'score': res.score,
            'total': res.total,
            'percentage': res.percentage,
            'date': res.created_at.strftime('%Y-%m-%d %H:%M') if hasattr(res, 'created_at') and res.created_at else '',
        })
    return JsonResponse({'leaderboard': leaderboard}, encoder=DjangoJSONEncoder)



# Contact form API endpoint
@csrf_exempt
@require_POST
def api_contact_message(request):
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        message = data.get('message', '').strip()
        if not name or not email or not message:
            return JsonResponse({'status': 'error', 'message': 'All fields are required.'}, status=400)
        ContactMessage.objects.create(name=name, email=email, message=message)
        return JsonResponse({'status': 'success', 'message': 'Your message has been submitted.'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    

def index(request):
    return render(request, 'pages/index.html')

# API endpoint: Fetch questions (optionally by department)
def api_questions(request):
    department = request.GET.get('department')
    num_dept = int(request.GET.get('num_dept', 5))
    num_gen = int(request.GET.get('num_gen', 5))
    questions = []
    import random
    if department:
        try:
            dept_obj = Department.objects.get(name=department)
            dept_questions = list(Question.objects.filter(department=dept_obj, question_type='DEPT'))
        except Department.DoesNotExist:
            dept_questions = []
        # If no department questions, return empty list (do NOT include general questions)
        if not dept_questions:
            return JsonResponse({'questions': []})
        selected_dept = random.sample(dept_questions, min(num_dept, len(dept_questions)))
        all_questions = selected_dept
    else:
        dept_questions = list(Question.objects.filter(question_type='DEPT'))
        general_questions = list(Question.objects.filter(question_type='GEN'))
        if not dept_questions and not general_questions:
            return JsonResponse({'questions': []})
        selected_dept = random.sample(dept_questions, min(num_dept, len(dept_questions)))
        selected_gen = random.sample(general_questions, min(num_gen, len(general_questions)))
        all_questions = selected_dept + selected_gen
    random.shuffle(all_questions)
    for q in all_questions:
        questions.append({
            'id': q.id,
            'text': q.text,
            'options': [q.option1, q.option2, q.option3, q.option4],
            'answer': q.answer,  # Remove this in production for security!
            'department': q.department.name if q.department else '',
            'question_type': q.question_type,
        })
    return JsonResponse({'questions': questions})

# API endpoint: Save quiz result
@csrf_exempt
def api_save_result(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            matric = data.get('matric')
            name = data.get('name')
            field = data.get('field')
            score = int(data.get('score', 0))
            total = int(data.get('total', 0))
            percentage = float(data.get('percentage', 0))
            department = Department.objects.filter(name=field).first()
            user, _ = User.objects.get_or_create(username=matric, defaults={'first_name': name})
            profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'matric': matric, 'department': department})
            QuizResult.objects.create(user=profile, score=score, total=total, percentage=percentage)
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Invalid method'}, status=405)

def quiz_login(request):
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        matric = request.POST.get('matric', '').strip().upper()
        field = request.POST.get('field', '').strip()

        if not name or not matric or not field:
            messages.error(request, 'Please fill in all fields.')
            return redirect('quiz_login')

        try:
            department = Department.objects.get(name=field)
        except Department.DoesNotExist:
            messages.error(request, 'Invalid department selected.')
            return redirect('quiz_login')

        user, _ = User.objects.get_or_create(username=matric, defaults={'first_name': name})
        profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'matric': matric, 'department': department})
        profile.department = department
        profile.save()

        dept_questions = list(Question.objects.filter(department=department, question_type='DEPT'))
        general_questions = list(Question.objects.filter(question_type='GEN'))
        import random
        questions = random.sample(dept_questions, min(5, len(dept_questions))) + random.sample(general_questions, min(5, len(general_questions)))
        random.shuffle(questions)

        request.session['quiz_user'] = profile.id
        request.session['quiz_questions'] = [q.id for q in questions]
        request.session['quiz_index'] = 0
        request.session['quiz_score'] = 0
        request.session['quiz_total'] = len(questions)

        return redirect('quiz_question')
    return render(request, 'pages/index.html')

def quiz_question(request):
    profile_id = request.session.get('quiz_user')
    question_ids = request.session.get('quiz_questions', [])
    index = request.session.get('quiz_index', 0)
    score = request.session.get('quiz_score', 0)
    total = request.session.get('quiz_total', 0)

    if index >= len(question_ids):
        return redirect('quiz_result')

    question = Question.objects.get(id=question_ids[index])

    if request.method == 'POST':
        selected = request.POST.get('selected_option')
        if selected == question.answer:
            score += 1
        request.session['quiz_score'] = score
        request.session['quiz_index'] = index + 1
        return redirect('quiz_question')

    return render(request, 'pages/quiz_question.html', {'question': question, 'index': index+1, 'total': total})

def quiz_result(request):
    profile_id = request.session.get('quiz_user')
    score = request.session.get('quiz_score', 0)
    total = request.session.get('quiz_total', 0)
    profile = UserProfile.objects.get(id=profile_id)
    percentage = (score / total) * 100 if total else 0
    QuizResult.objects.create(user=profile, score=score, total=total, percentage=percentage)
    for key in ['quiz_user', 'quiz_questions', 'quiz_index', 'quiz_score', 'quiz_total']:
        if key in request.session:
            del request.session[key]
    return render(request, 'pages/quiz_result.html', {'score': score, 'total': total, 'percentage': percentage})
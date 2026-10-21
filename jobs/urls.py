
from django.urls import path
from .views import job_list, job_detail
from .auth_views import register, login

urlpatterns = [
    path('', job_list, name='job_list'),
    path('<int:pk>/', job_detail, name='job_detail'),

    path('register/', register, name='register'),
    path('login/', login, name='login'),
]

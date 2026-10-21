
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import JobApplication
from .serializers import JobApplicationSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def job_list(request):

    if request.method == 'GET':
        jobs = JobApplication.objects.filter(user=request.user)
        serializer = JobApplicationSerializer(jobs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = JobApplicationSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def job_detail(request, pk):

    try:
        job = JobApplication.objects.get(
            pk=pk,
            user=request.user
        )

    except JobApplication.DoesNotExist:
        return Response(
            {"error": "Job application not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = JobApplicationSerializer(job)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = JobApplicationSerializer(
            job,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    elif request.method == 'DELETE':
        job.delete()
        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

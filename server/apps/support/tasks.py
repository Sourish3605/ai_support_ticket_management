from celery import shared_task


@shared_task
def test_celery_task():
    return "Celery is working!"
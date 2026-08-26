from datetime import datetime, timezone

from .models import AgentExecution


def start_agent_execution(workflow, agent_name, input_data=None):
    """
    Create a new AgentExecution record when an agent starts.
    """

    execution = AgentExecution.objects.create(
        workflow=workflow,
        agent_name=agent_name,
        input_data=input_data or {},
        status="Started",
    )

    return execution


def complete_agent_execution(
    execution,
    output_data=None,
    confidence=None
):
    """
    Mark an agent execution as completed.
    """

    execution.output_data = output_data or {}
    execution.confidence = confidence
    execution.status = "Completed"
    execution.completed_at = datetime.now(timezone.utc)

    execution.save()

    return execution


def fail_agent_execution(
    execution,
    output_data=None
):
    """
    Mark an agent execution as failed.
    """

    execution.output_data = output_data or {}
    execution.status = "Failed"
    execution.completed_at = datetime.now(timezone.utc)

    execution.save()

    return execution

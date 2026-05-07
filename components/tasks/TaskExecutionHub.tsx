"use client"

import { useRouter } from "next/navigation"
import { TaskResponse } from "@/lib/api/types"
import { TaskHierarchyTable } from "./TaskHierarchyTable"
import { tasksApi } from "@/lib/api/tasks"

interface TaskExecutionHubProps {
  tasks: TaskResponse[]
  onUpdate: () => void
}

export function TaskExecutionHub({ tasks, onUpdate }: TaskExecutionHubProps) {
  const router = useRouter()

  const handleSelectTask = (task: TaskResponse) => {
    router.push(`/tasks/${task.taskId}`)
  }

  const handleUpdateStatus = async (taskId: number, status: string) => {
    try {
      await tasksApi.updateStatus(taskId, status)
      onUpdate()
    } catch (error) {
      console.error("Failed to update status", error)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return
    try {
      await tasksApi.delete(taskId)
      onUpdate()
    } catch (error) {
      console.error("Failed to delete task", error)
    }
  }

  return (
    <TaskHierarchyTable 
      tasks={tasks}
      onSelectTask={handleSelectTask}
      onUpdateStatus={handleUpdateStatus}
      onDeleteTask={handleDeleteTask}
    />
  )
}

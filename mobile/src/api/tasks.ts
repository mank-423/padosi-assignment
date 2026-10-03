import { api } from './client';

export type Category = { id: string; name: string };
export type Task = {
  id: string;
  name: string;
  description: string;
  category: Category;
};

export type SelectedTask = Task & {
  customDescription: string | null;
  createdAt: string;
};

export const tasksApi = {
  categories: () => api.get<Category[]>('/categories').then((r) => r.data),
  list: (params?: { search?: string; categoryId?: string }) =>
    api.get<Task[]>('/tasks', { params }).then((r) => r.data),
  selected: () => api.get<SelectedTask[]>('/tasks/selected').then((r) => r.data),
  add: (taskId: string, description?: string) =>
    api.post<SelectedTask[]>('/tasks/selected', { taskId, description }).then((r) => r.data),
  remove: (taskId: string) =>
    api.delete<SelectedTask[]>(`/tasks/selected/${taskId}`).then((r) => r.data),
};
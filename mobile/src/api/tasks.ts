import { api } from './client';

export type Category = { id: string; name: string };
export type Task = {
  id: string;
  name: string;
  description: string;
  category: Category;
};

export const tasksApi = {
  categories: () => api.get<Category[]>('/categories').then((r) => r.data),

  list: (params?: { search?: string; categoryId?: string }) =>
    api.get<Task[]>('/tasks', { params }).then((r) => r.data),

  select: (taskIds: string[]) =>
    api.post<Task[]>('/tasks/select', { taskIds }).then((r) => r.data),

  selected: () => api.get<Task[]>('/tasks/selected').then((r) => r.data),
};
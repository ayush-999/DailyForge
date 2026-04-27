import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// This is an example of an "App" feature in the DailyForge ecosystem.
// Users can "install" the Todo app, which initializes this slice.

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  isInstalled: boolean;
}

const initialState: TodoState = {
  todos: [],
  isInstalled: true, // In reality, this would be fetched from user preferences
};

export const todoSlice = createSlice({
  name: 'todo',
  initialState,
  reducers: {
    addTodo: (state, action: PayloadAction<string>) => {
      state.todos.push({
        id: new Date().toISOString(),
        text: action.payload,
        completed: false,
      });
    },
    toggleTodo: (state, action: PayloadAction<string>) => {
      const todo = state.todos.find((t) => t.id === action.payload);
      if (todo) {
        todo.completed = !todo.completed;
      }
    },
  },
});

export const { addTodo, toggleTodo } = todoSlice.actions;
export default todoSlice.reducer;

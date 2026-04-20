import { useState, useEffect } from 'react';

function App() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [editingTodo, setEditingTodo] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // 从本地存储加载待办事项
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  }, []);

  // 保存待办事项到本地存储
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // 添加新待办事项
  const handleAddTodo = () => {
    if (inputValue.trim() !== '') {
      setTodos([...todos, {
        id: Date.now(),
        text: inputValue,
        completed: false
      }]);
      setInputValue('');
    }
  };

  // 切换待办事项完成状态
  const handleToggleComplete = (id) => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        return { ...todo, completed: !todo.completed };
      }
      return todo;
    }));
  };

  // 开始编辑待办事项
  const handleEditStart = (todo) => {
    setEditingTodo(todo.id);
    setEditingValue(todo.text);
  };

  // 保存编辑后的待办事项
  const handleEditSave = (id) => {
    if (editingValue.trim() !== '') {
      setTodos(todos.map(todo => {
        if (todo.id === id) {
          return { ...todo, text: editingValue };
        }
        return todo;
      }));
      setEditingTodo(null);
      setEditingValue('');
    }
  };

  // 取消编辑
  const handleEditCancel = () => {
    setEditingTodo(null);
    setEditingValue('');
  };

  // 删除待办事项
  const handleDeleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // 清除所有已完成的待办事项
  const handleClearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  return (
    <div className="container">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Todo App</h1>
        <p className="text-gray-600">Manage your tasks efficiently</p>
      </div>

      {/* Add Todo Form */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add a new todo..."
            className="input flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
          />
          <button 
            onClick={handleAddTodo}
            className="btn-primary whitespace-nowrap"
          >
            Add Todo
          </button>
        </div>
      </div>

      {/* Todo List */}
      <div className="mb-6">
        {todos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">No todos yet. Add your first todo!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todos.map(todo => (
              <div key={todo.id} className="todo-card flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleComplete(todo.id)}
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                  {editingTodo === todo.id ? (
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="input flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleEditSave(todo.id)}
                      autoFocus
                    />
                  ) : (
                    <span className={`${todo.completed ? 'todo-completed' : ''} flex-1`}>
                      {todo.text}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {editingTodo === todo.id ? (
                    <>
                      <button 
                        onClick={() => handleEditSave(todo.id)}
                        className="btn-secondary text-sm px-3 py-1"
                      >
                        Save
                      </button>
                      <button 
                        onClick={handleEditCancel}
                        className="btn-danger text-sm px-3 py-1"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleEditStart(todo)}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="btn-danger text-sm px-3 py-1"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Todo Stats and Actions */}
      {todos.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-600">
            {todos.filter(todo => !todo.completed).length} items left
          </p>
          <button 
            onClick={handleClearCompleted}
            className="btn-secondary"
          >
            Clear Completed
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Built with React and Tailwind CSS</p>
      </div>
    </div>
  );
}

export default App;
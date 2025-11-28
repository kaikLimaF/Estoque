function Modal({ title, children, onCancel, onSave }) {
  return (
    <div id="editModal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-30 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md fade-in max-h-[85vh] overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>
        <div className="p-4 sm:p-6 border-t bg-gray-50 rounded-b-xl flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition">
            Cancelar
          </button>
          <button onClick={onSave} id="editModalSave" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

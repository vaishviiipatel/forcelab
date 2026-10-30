import { useState } from 'react'

// onSave(name, note) returns a promise: null when saved, or an error message string
function SaveExperimentModal({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    const err = await onSave(name.trim(), note.trim())
    if (err) {
      setError(err)
      setSaving(false)
    }
  }

  const inputStyle =
    'mt-1 w-full rounded-lg border border-[#0b0f19]/60 bg-white px-3 py-2 font-jetbrains text-sm text-[#0b0f19] outline-none focus:border-[#0b0f19]'

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[inherit]">
      <form
        onSubmit={handleSubmit}
        className="w-[360px] max-w-[90%] rounded-3xl border border-white/70 bg-[linear-gradient(135deg,#eef2f6,#a9b6c5,#eef2f6)] p-8 shadow-2xl"
      >
        <h3 className="font-rajdhani font-bold text-2xl text-[#0b0f19] text-center">
          Save Experiment
        </h3>

        <label className="block mt-5 font-rajdhani font-semibold text-[#0b0f19]">
          Name
          <input
            autoFocus
            maxLength={40}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            className={inputStyle}
          />
        </label>
        {error && (
          <p className="mt-2 font-jetbrains text-xs text-red-700">{error}</p>
        )}

        <label className="block mt-4 font-rajdhani font-semibold text-[#0b0f19]">
          Add a note (optional)
          <input
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputStyle}
          />
        </label>

        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full mt-6 rounded-lg bg-[#212d39] py-2 font-rajdhani font-semibold text-white hover:bg-[#2d3b4a] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Experiment'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-3 rounded-lg border border-[#0b0f19]/40 bg-white py-2 font-rajdhani font-semibold text-[#0b0f19] hover:bg-gray-100 transition cursor-pointer"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}

export default SaveExperimentModal
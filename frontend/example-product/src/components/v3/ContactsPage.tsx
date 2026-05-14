import { useState } from 'react'
import { Search, Plus, User, X, Check, UserPlus } from 'lucide-react'

interface Contact {
  id: string
  name: string
  payId: string
  address: string
}

const initialContacts: Contact[] = [
  { id: '1', name: 'Alice Johnson', payId: 'alice@payid.app', address: '0x1234...5678' },
  { id: '2', name: 'Bob Smith', payId: 'bob@payid.app', address: '0xabcd...ef12' },
  { id: '3', name: 'Carol White', payId: 'carol@payid.app', address: '0x9876...5432' },
]

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newPayId, setNewPayId] = useState('')
  const [newName, setNewName] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.payId.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddContact = () => {
    if (newPayId && newName) {
      setContacts((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: newName,
          payId: newPayId,
          address: '0x' + Math.random().toString(16).slice(2, 10) + '...',
        },
      ])
      setAddSuccess(true)
      setTimeout(() => {
        setAddSuccess(false)
        setShowAdd(false)
        setNewPayId('')
        setNewName('')
      }, 1500)
    }
  }

  const handleRemove = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Contacts
        </h1>
        <button
          onClick={() => setShowAdd(true)}
          className="btn btn-primary p-2.5"
          style={{ borderRadius: '12px' }}
        >
          <Plus style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ width: 18, height: 18, color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contacts..."
          className="input w-full pl-11"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* Contact List */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((contact) => (
            <div
              key={contact.id}
              className="card p-4 flex items-center gap-4 group"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #1A1F71, #2D336B)' }}
              >
                {contact.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {contact.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {contact.payId}
                </p>
              </div>

              <button
                onClick={() => handleRemove(contact.id)}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 transition-all"
                style={{ color: '#EF4444' }}
                title="Remove contact"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <UserPlus style={{ width: 28, height: 28, color: 'var(--text-muted)' }} />
          </div>
          <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
            No contacts yet
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Add your first contact to send money faster
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="btn btn-primary mt-4"
          >
            <Plus style={{ width: 16, height: 16 }} />
            Add Contact
          </button>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.4)' }}
            onClick={() => setShowAdd(false)}
          />
          <div
            className="relative w-full max-w-md mx-4 mb-4 md:mb-0 card p-6 animate-slide-up"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            {addSuccess ? (
              <div className="text-center py-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(0, 200, 150, 0.12)' }}
                >
                  <Check style={{ width: 32, height: 32, color: 'var(--accent-green)' }} />
                </div>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Contact added!
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Add Contact
                  </h2>
                  <button
                    onClick={() => setShowAdd(false)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <X style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Payment Address
                    </label>
                    <input
                      type="text"
                      value={newPayId}
                      onChange={(e) => setNewPayId(e.target.value)}
                      placeholder="e.g. alice@payid.app"
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Alice Johnson"
                      className="input w-full"
                    />
                  </div>

                  <button
                    onClick={handleAddContact}
                    disabled={!newPayId || !newName}
                    className="btn btn-primary w-full justify-center py-3 mt-2"
                  >
                    <UserPlus style={{ width: 16, height: 16 }} />
                    Add Contact
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

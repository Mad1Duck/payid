import { AnimatePresence } from 'framer-motion'
import { useDAOPayroll } from '../hooks/useDAOPayroll'
import {
  PayrollHeader,
  TreasuryStatus,
  RecipientsList,
  SimulationResult,
  ActionBar,
  PayrollHistory,
  ActiveSubscriptions,
} from '../components'

export default function DAOPayroll() {
  const {
    p, nativeSymbol, balance,
    recipients, newAddress, setNewAddress, newAmount, setNewAmount,
    newRole, setNewRole, newSchedule, setNewSchedule, showAddForm, setShowAddForm,
    simulationResult, runs, totalPayroll, isSufficient,
    addRecipient, removeRecipient, simulate, createSubscriptions, isCreating, isBatching,
    userSubscriptions, isLoadingSubs, fetchUserSubscriptions,
  } = useDAOPayroll()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PayrollHeader p={p} />

      <TreasuryStatus
        p={p}
        balance={balance}
        nativeSymbol={nativeSymbol}
        totalPayroll={totalPayroll}
        isSufficient={isSufficient}
        recipients={recipients}
      />

      <RecipientsList
        p={p}
        recipients={recipients}
        newAddress={newAddress}
        setNewAddress={setNewAddress}
        newAmount={newAmount}
        setNewAmount={setNewAmount}
        newRole={newRole}
        setNewRole={setNewRole}
        newSchedule={newSchedule}
        setNewSchedule={setNewSchedule}
        showAddForm={showAddForm}
        setShowAddForm={setShowAddForm}
        addRecipient={addRecipient}
        removeRecipient={removeRecipient}
      />

      <AnimatePresence mode="wait">
        {simulationResult && (
          <SimulationResult
            p={p}
            simulationResult={simulationResult}
            isCreating={isCreating}
            isBatching={isBatching}
            createSubscriptions={createSubscriptions}
          />
        )}
      </AnimatePresence>

      {!simulationResult && (
        <ActionBar
          isSufficient={isSufficient}
          recipients={recipients}
          simulate={simulate}
        />
      )}

      <PayrollHistory p={p} runs={runs} />

      <ActiveSubscriptions
        p={p}
        nativeSymbol={nativeSymbol}
        userSubscriptions={userSubscriptions}
        isLoadingSubs={isLoadingSubs}
        fetchUserSubscriptions={fetchUserSubscriptions}
      />
    </div>
  )
}

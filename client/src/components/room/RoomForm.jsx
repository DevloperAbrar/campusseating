import { useForm } from 'react-hook-form'
import Input from '../ui/Input'
import Button from '../ui/Button'

export default function RoomForm({ defaultValues, onSubmit, loading, onCancel }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: defaultValues || {
      defaultSeatsPerBench: 2,
      rows: 5,
      benchesPerRow: 10,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input
            label="Room Name"
            required
            placeholder="e.g. Hall A"
            error={errors.name?.message}
            {...register('name', { required: 'Room name is required' })}
          />
        </div>
        <Input
          label="Building"
          placeholder="e.g. Main Block"
          {...register('building')}
        />
        <Input
          label="Floor"
          placeholder="e.g. Ground Floor"
          {...register('floor')}
        />
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Layout Configuration
        </p>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Number of Rows"
            type="number"
            required
            min={1}
            max={26}
            error={errors.rows?.message}
            {...register('rows', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Min 1' }, max: { value: 26, message: 'Max 26' } })}
          />
          <Input
            label="Benches per Row"
            type="number"
            required
            min={1}
            error={errors.benchesPerRow?.message}
            {...register('benchesPerRow', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Min 1' } })}
          />
          <div className="form-group">
            <label className="label">
              Seats per Bench <span className="text-red-500">*</span>
            </label>
            <select
              className="input"
              {...register('defaultSeatsPerBench', { required: 'Required', valueAsNumber: true })}
            >
              <option value={1}>1 (Single)</option>
              <option value={2}>2 (L, R)</option>
              <option value={3}>3 (L, M, R)</option>
              <option value={4}>4 (1, 2, 3, 4)</option>
            </select>
          </div>
        </div>
      </div>

      {defaultValues?._id && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          ⚠ Editing rows, benches, or seats per bench will regenerate all seat positions. Any custom seat statuses will be reset.
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {defaultValues?._id ? 'Update Room' : 'Create Room'}
        </Button>
      </div>
    </form>
  )
}
// client/src/components/shared/index.jsx
//
// BARREL FILE — re-exports everything from individual files.
// This is why your pages can do:
//   import { ConfirmModal, Pagination, CSVUpload, StatCard } from '../../components/shared/index.jsx'
// OR equivalently:
//   import { ConfirmModal, Pagination, CSVUpload, StatCard } from '../../components/shared'
//
// Nothing logic lives here — keep this file only as re-exports.

export { default as CSVUpload }    from './CSVUpload'
export { default as Pagination }   from './Pagination'
export { default as StatCard }     from './StatCard'
export { default as ConfirmModal } from '../layout/ConfirmModal'
import { listarRecordatorios } from './_actions'
import { RecordatoriosView } from './recordatorios-view'
export const dynamic = 'force-dynamic'
export default async function Page() { return <RecordatoriosView items={await listarRecordatorios()} /> }

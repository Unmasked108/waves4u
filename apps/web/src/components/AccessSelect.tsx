/** Who can see a piece of content (spec: "marking each as Free or Premium"). */
export default function AccessSelect({ id, value, onChange, label = 'Who can see it' }: { id: string; value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="free">Free: everyone</option>
        <option value="premium">Premium: any paid plan</option>
        <option value="club">Club: waves4u club members only</option>
      </select>
    </div>
  );
}

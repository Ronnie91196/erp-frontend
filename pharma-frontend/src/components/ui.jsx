import React from 'react';
export function Button({children,variant='primary',...p}){return <button className={`btn ${variant}`} {...p}>{children}</button>}
export function Card({title,children,actions}){return <section className="card"><div className="cardHead"><h3>{title}</h3>{actions}</div>{children}</section>}
export function Input({label,error,...p}){return <label className="field"><span>{label}</span><input {...p}/>{error&&<small className="error">{error}</small>}</label>}
export function Select({label,children,...p}){return <label className="field"><span>{label}</span><select {...p}>{children}</select></label>}
export function Textarea({label,...p}){return <label className="field"><span>{label}</span><textarea {...p}/></label>}
export function Badge({children,tone='neutral'}){return <span className={`badge ${tone}`}>{children}</span>}
export function Empty({children='No records found'}){return <div className="empty">{children}</div>}
export function Table({columns,rows,onRow}){return <div className="tableWrap"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={r.id||i} onClick={()=>onRow?.(r)}>{columns.map(c=><td key={c.key}>{c.render?c.render(r):String(r[c.key]??'—')}</td>)}</tr>):<tr><td colSpan={columns.length}><Empty/></td></tr>}</tbody></table></div>}
export const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(v||0));
export const date=v=>v?new Date(v).toLocaleDateString('en-IN'):'';

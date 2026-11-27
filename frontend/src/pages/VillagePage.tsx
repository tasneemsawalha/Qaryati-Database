import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { villages } from '../api/endpoints';
import type { EntryKind, Village } from '../api/types';
import { useAuth } from '../auth';
import { ErrorBox, Loading, Source, SourceText, StatusBadge, useAction } from '../components/ui';
import { KIND_LABEL, NAME_TYPE_LABEL, RELATION_LABEL, fmtDate, fmtNumber } from '../labels';
import PopulationSection from '../components/PopulationSection';
import EntriesSection from '../components/EntriesSection';
import AuditSection from '../components/AuditSection';

type Tab = 'overview' | 'population' | EntryKind | 'audit';
const KINDS: EntryKind[] = ['EVENT', 'LANDMARK', 'HERITAGE', 'ECONOMY', 'FACILITY'];

export default function VillagePage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { can } = useAuth();
  const [village, setVillage] = useState<Village | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const action = useAction();

  const load = useCallback(() => {
    villages.get(id).then(setVillage).catch(setLoadError);
  }, [id]);
  useEffect(load, [load]);

  if (loadError) return <ErrorBox error={loadError} />;
  if (!village) return <Loading />;
  const v = village;

  const tabs: [Tab, string][] = [
    ['overview', 'نظرة عامة'],
    ['population', 'السكان'],
    ...KINDS.map((k) => [k, KIND_LABEL[k]] as [Tab, string]),
    ...(can('VERIFIER', 'ADMIN') ? ([['audit', 'سجل التغييرات']] as [Tab, string][]) : []),
  ];

  return (
    <article>
      <header className="village-head">
        <div>
          <p className="crumbs">
            <Link to="/">القرى</Link> / محافظة {v.governorate}
          </p>
          <h1>
            {v.arabicName} {v.englishName && <span className="latin">{v.englishName}</span>}
          </h1>
          <p className="muted">
            <StatusBadge status={v.status} />{' '}
            {v.verifiedAt && `وُثّقت ${fmtDate(v.verifiedAt)} · `}
            آخر تحديث {fmtDate(v.updatedAt)} · النسخة {v.version}
          </p>
        </div>
        <div className="actions">
          {can('EDITOR', 'ADMIN') && (
            <Link className="button" to={`/villages/${v.id}/edit`}>
              تعديل
            </Link>
          )}
          {can('VERIFIER', 'ADMIN') && v.status === 'DRAFT' && (
            <button
              disabled={action.busy}
              onClick={() =>
                action.run(async () => setVillage(await villages.verify(v.id, v.version)))
              }
            >
              توثيق
            </button>
          )}
          {can('ADMIN') && (
            <button
              className="danger"
              disabled={action.busy}
              onClick={() => {
                if (!confirm(`حذف قرية ${v.arabicName} مع كل سجلاتها؟ لا يمكن التراجع.`)) return;
                void action.run(async () => {
                  await villages.remove(v.id, v.version);
                  navigate('/');
                });
              }}
            >
              حذف
            </button>
          )}
        </div>
      </header>
      <ErrorBox error={action.error} />

      <div className="tabs scroll">
        {tabs.map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview v={v} />}
      {tab === 'population' && <PopulationSection villageId={v.id} />}
      {KINDS.includes(tab as EntryKind) && (
        <EntriesSection key={tab} villageId={v.id} kind={tab as EntryKind} />
      )}
      {tab === 'audit' && <AuditSection villageId={v.id} />}
    </article>
  );
}

function Overview({ v }: { v: Village }) {
  const hasCoords = v.latitude != null && v.longitude != null;
  return (
    <div className="two-col">
      <section className="card">
        <h2>الهوية والأسماء</h2>
        <dl className="facts">
          <dt>الاسم</dt>
          <dd>{v.arabicName}</dd>
          {v.englishName && (
            <>
              <dt>بالإنجليزية</dt>
              <dd className="latin">{v.englishName}</dd>
            </>
          )}
          <dt>المحافظة</dt>
          <dd>{v.governorate}</dd>
          {v.localCouncil && (
            <>
              <dt>الهيئة المحلية</dt>
              <dd>{v.localCouncil}</dd>
            </>
          )}
          {v.municipalityRelationship && (
            <>
              <dt>العلاقة البلدية</dt>
              <dd>{v.municipalityRelationship}</dd>
            </>
          )}
        </dl>
        {v.nameOrigin && (
          <>
            <h3>أصل التسمية</h3>
            <p>{v.nameOrigin}</p>
            <Source>{v.nameOriginSource}</Source>
          </>
        )}
        {v.aliases.length > 0 && (
          <>
            <h3>أسماء أخرى</h3>
            <ul className="plain">
              {v.aliases.map((a) => (
                <li key={`${a.type}-${a.value}`}>
                  <b>{a.value}</b> <span className="muted">— {NAME_TYPE_LABEL[a.type]}</span>
                  {a.source && (
                    <span className="muted">
                      {' '}
                      · المصدر: <SourceText text={a.source} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>الجغرافيا والموقع</h2>
        {v.locationDescription && <p>{v.locationDescription}</p>}
        <dl className="facts">
          {hasCoords && (
            <>
              <dt>الإحداثيات</dt>
              <dd dir="ltr" className="latin">
                {v.latitude!.toFixed(4)}, {v.longitude!.toFixed(4)}{' '}
                <a
                  href={`https://www.openstreetmap.org/?mlat=${v.latitude}&mlon=${v.longitude}#map=14/${v.latitude}/${v.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  الخريطة ↗
                </a>
              </dd>
            </>
          )}
          {v.elevationMeters != null && (
            <>
              <dt>الارتفاع</dt>
              <dd>{fmtNumber(v.elevationMeters)} م</dd>
            </>
          )}
          {v.landAreaKm2 != null && (
            <>
              <dt>المساحة</dt>
              <dd>{fmtNumber(v.landAreaKm2)} كم²</dd>
            </>
          )}
        </dl>
        {v.nearbyPlaces && v.nearbyPlaces.length > 0 && (
          <>
            <h3>أماكن قريبة</h3>
            <ul className="plain">
              {v.nearbyPlaces.map((p, i) => (
                <li key={i}>
                  {p.name} <span className="muted">— {RELATION_LABEL[p.relationship]}</span>
                  {p.distanceKm != null && <span className="muted"> · {p.distanceKm} كم</span>}
                </li>
              ))}
            </ul>
          </>
        )}
        {!hasCoords && !v.locationDescription && (
          <p className="muted">لا توجد بيانات جغرافية بعد.</p>
        )}
      </section>

      {v.historicalOverview && (
        <section className="card wide">
          <h2>لمحة تاريخية</h2>
          <p className="prose">{v.historicalOverview}</p>
          <Source>{v.historySource}</Source>
        </section>
      )}
    </div>
  );
}

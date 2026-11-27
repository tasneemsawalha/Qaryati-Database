import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { geocoding, villages } from '../api/endpoints';
import type { Alias, GeocodingResult, NameType, NearbyPlace, Village } from '../api/types';
import { useAuth } from '../auth';
import { ErrorBox, Field, Loading, useAction } from '../components/ui';
import { GOVERNORATES, NAME_TYPE_LABEL, RELATION_LABEL } from '../labels';

const TEXT_FIELDS = [
  'arabicName',
  'englishName',
  'nameOrigin',
  'nameOriginSource',
  'governorate',
  'localCouncil',
  'municipalityRelationship',
  'locationDescription',
  'historicalOverview',
  'historySource',
] as const;
const NUMBER_FIELDS = ['latitude', 'longitude', 'elevationMeters', 'landAreaKm2'] as const;
type TextKey = (typeof TEXT_FIELDS)[number];
type NumberKey = (typeof NUMBER_FIELDS)[number];
type Form = Record<TextKey | NumberKey, string>;

const emptyForm = Object.fromEntries(
  [...TEXT_FIELDS, ...NUMBER_FIELDS].map((k) => [k, '']),
) as Form;

function fromVillage(v: Village): Form {
  const f = { ...emptyForm };
  for (const k of TEXT_FIELDS) f[k] = v[k] ?? '';
  for (const k of NUMBER_FIELDS) f[k] = v[k]?.toString() ?? '';
  return f;
}

export default function VillageFormPage() {
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const navigate = useNavigate();
  const { can, ready } = useAuth();
  const [original, setOriginal] = useState<Village | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [geo, setGeo] = useState<GeocodingResult | null>(null);
  const save = useAction();
  const geoAction = useAction();

  useEffect(() => {
    if (!id) return;
    villages
      .get(id)
      .then((v) => {
        setOriginal(v);
        setForm(fromVillage(v));
        setAliases(v.aliases.map(({ value, type, source }) => ({ value, type, source })));
        setNearby(v.nearbyPlaces ?? []);
      })
      .catch(save.setError);
  }, [id]);

  if (!ready) return <Loading />;
  if (!can('EDITOR', 'ADMIN'))
    return <p className="empty">إضافة وتعديل القرى متاحة للمحرر أو المسؤول فقط.</p>;
  if (id && !original) return save.error ? <ErrorBox error={save.error} /> : <Loading />;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function payload() {
    // On create, omit empty optional fields. On edit, send null to clear them.
    const empty = id ? null : undefined;
    const body: Record<string, unknown> = {};
    for (const k of TEXT_FIELDS) body[k] = form[k].trim() || empty;
    for (const k of NUMBER_FIELDS) body[k] = form[k].trim() === '' ? empty : Number(form[k]);
    body.aliases = aliases
      .filter((a) => a.value.trim())
      .map((a) => ({ value: a.value.trim(), type: a.type, ...(a.source?.trim() ? { source: a.source.trim() } : {}) }));
    body.nearbyPlaces = nearby
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        relationship: p.relationship,
        ...(p.distanceKm != null && !Number.isNaN(p.distanceKm) ? { distanceKm: p.distanceKm } : {}),
      }));
    if (id) body.version = original!.version;
    return body;
  }

  return (
    <section className="form-page">
      <h1>{id ? `تعديل: ${original?.arabicName}` : 'إضافة قرية جديدة'}</h1>
      {id && (
        <p className="notice">
          أي تعديل يعيد حالة القرية إلى "مسودة" حتى يوثّقها مدقق من جديد.
        </p>
      )}
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const v = await save.run(() =>
            id ? villages.update(id, payload()) : villages.create(payload()),
          );
          if (v) navigate(`/villages/${v.id}`);
        }}
      >
        <fieldset className="card">
          <legend>الهوية والأسماء</legend>
          <div className="row">
            <Field label="الاسم العربي *">
              <input required value={form.arabicName} onChange={set('arabicName')} />
            </Field>
            <Field label="الاسم بالإنجليزية">
              <input dir="ltr" value={form.englishName} onChange={set('englishName')} />
            </Field>
          </div>
          <Field label="معنى / أصل التسمية">
            <textarea rows={2} value={form.nameOrigin} onChange={set('nameOrigin')} />
          </Field>
          <Field label="مصدر أصل التسمية" hint="مطلوب إذا كتبتِ أصل التسمية">
            <input
              value={form.nameOriginSource}
              onChange={set('nameOriginSource')}
              required={!!form.nameOrigin.trim()}
            />
          </Field>
          <h4>أسماء بديلة / قديمة / تهجئات</h4>
          {aliases.map((a, i) => (
            <div className="row repeat" key={i}>
              <input
                placeholder="الاسم"
                value={a.value}
                onChange={(e) => setAliases(aliases.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
              />
              <select
                value={a.type}
                onChange={(e) =>
                  setAliases(aliases.map((x, j) => (j === i ? { ...x, type: e.target.value as NameType } : x)))
                }
              >
                {(Object.keys(NAME_TYPE_LABEL) as NameType[]).map((t) => (
                  <option key={t} value={t}>
                    {NAME_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <input
                placeholder="المصدر (اختياري)"
                value={a.source ?? ''}
                onChange={(e) => setAliases(aliases.map((x, j) => (j === i ? { ...x, source: e.target.value } : x)))}
              />
              <button type="button" className="link danger" onClick={() => setAliases(aliases.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setAliases([...aliases, { value: '', type: 'ALTERNATIVE' }])}>
            + اسم
          </button>
        </fieldset>

        <fieldset className="card">
          <legend>التبعية الإدارية</legend>
          <div className="row">
            <Field label="المحافظة *">
              <input list="governorates" required value={form.governorate} onChange={set('governorate')} />
              <datalist id="governorates">
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
            <Field label="الهيئة المحلية / المجلس">
              <input value={form.localCouncil} onChange={set('localCouncil')} />
            </Field>
          </div>
          <Field label="العلاقة مع البلدية" hint="مثلاً: مجلس قروي مستقل، تتبع لبلدية …">
            <input value={form.municipalityRelationship} onChange={set('municipalityRelationship')} />
          </Field>
        </fieldset>

        <fieldset className="card">
          <legend>الجغرافيا والموقع</legend>
          <Field label="وصف الموقع">
            <textarea rows={2} value={form.locationDescription} onChange={set('locationDescription')} />
          </Field>
          <div className="row">
            <Field label="خط العرض">
              <input type="number" step="any" min={-90} max={90} value={form.latitude} onChange={set('latitude')} />
            </Field>
            <Field label="خط الطول">
              <input type="number" step="any" min={-180} max={180} value={form.longitude} onChange={set('longitude')} />
            </Field>
            <Field label="الارتفاع (م)">
              <input type="number" step="any" value={form.elevationMeters} onChange={set('elevationMeters')} />
            </Field>
            <Field label="المساحة (كم²)">
              <input type="number" step="any" min={0} value={form.landAreaKm2} onChange={set('landAreaKm2')} />
            </Field>
          </div>
          <button
            type="button"
            disabled={geoAction.busy || !(form.englishName || form.arabicName).trim()}
            onClick={async () => {
              const r = await geoAction.run(() =>
                geocoding.search((form.englishName || form.arabicName).trim()),
              );
              if (r) setGeo(r);
            }}
          >
            {geoAction.busy ? 'جارٍ البحث…' : '📍 اقترح الإحداثيات من خدمة خارجية'}
          </button>
          <ErrorBox error={geoAction.error} />
          {geo && (
            <div className="geo">
              <p className="muted">
                {geo.meta.attribution} {geo.meta.cached && '(من الذاكرة المؤقتة)'} — اقتراحات
                فقط، تأكدي من المكان قبل الحفظ.
              </p>
              {geo.data.length === 0 && <p>لا نتائج.</p>}
              {geo.data.map((p, i) => (
                <button
                  type="button"
                  key={i}
                  className="geo-option"
                  onClick={() => {
                    setForm({
                      ...form,
                      latitude: String(p.latitude),
                      longitude: String(p.longitude),
                    });
                    setGeo(null);
                  }}
                >
                  {p.name}
                  {p.governorate && ` — ${p.governorate}`}
                  {p.country && `، ${p.country}`}{' '}
                  <span dir="ltr" className="muted">
                    ({p.latitude.toFixed(3)}, {p.longitude.toFixed(3)})
                  </span>
                </button>
              ))}
            </div>
          )}
          <h4>أماكن قريبة / مجاورة</h4>
          {nearby.map((p, i) => (
            <div className="row repeat" key={i}>
              <input
                placeholder="اسم المكان"
                value={p.name}
                onChange={(e) => setNearby(nearby.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <select
                value={p.relationship}
                onChange={(e) =>
                  setNearby(
                    nearby.map((x, j) =>
                      j === i ? { ...x, relationship: e.target.value as NearbyPlace['relationship'] } : x,
                    ),
                  )
                }
              >
                {(Object.keys(RELATION_LABEL) as NearbyPlace['relationship'][]).map((r) => (
                  <option key={r} value={r}>
                    {RELATION_LABEL[r]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                min={0}
                placeholder="المسافة كم"
                value={p.distanceKm ?? ''}
                onChange={(e) =>
                  setNearby(
                    nearby.map((x, j) =>
                      j === i ? { ...x, distanceKm: e.target.value === '' ? undefined : Number(e.target.value) } : x,
                    ),
                  )
                }
              />
              <button type="button" className="link danger" onClick={() => setNearby(nearby.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setNearby([...nearby, { name: '', relationship: 'NEARBY' }])}>
            + مكان
          </button>
        </fieldset>

        <fieldset className="card">
          <legend>لمحة تاريخية</legend>
          <Field label="النبذة التاريخية">
            <textarea rows={5} value={form.historicalOverview} onChange={set('historicalOverview')} />
          </Field>
          <Field label="مصدر النبذة" hint="مطلوب إذا كتبتِ نبذة تاريخية">
            <input
              value={form.historySource}
              onChange={set('historySource')}
              required={!!form.historicalOverview.trim()}
            />
          </Field>
        </fieldset>

        <ErrorBox error={save.error} />
        <div className="form-actions">
          <button className="primary" disabled={save.busy}>
            {save.busy ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
          <button type="button" onClick={() => navigate(-1)}>
            إلغاء
          </button>
        </div>
      </form>
    </section>
  );
}

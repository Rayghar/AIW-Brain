import { useState } from 'react';
import { Globe2 } from 'lucide-react';
import { setLocale, registerCatalog, type Locale } from '../i18n';

// Global audience: locale switching with RTL. Catalogs cover the intelligence
// surfaces authored in the 8.7.7+ line; legacy component extraction proceeds
// per the gap register.
registerCatalog('fr', {
  'goldenPath.title': 'Votre première conception, guidée', 'tpl.title': "Partir d'un scénario", 'tpl.use': 'Utiliser',
  'admin.title': 'Centre de contrôle', 'admin.approve': 'Approuver', 'admin.reject': 'Rejeter', 'admin.split': 'Scission contextuelle',
  'rel.validate': 'Valider', 'rel.promote': 'Promouvoir', 'dna.edit': 'Préparer les impacts',
});
registerCatalog('ar', {
  'goldenPath.title': 'تصميمك الأول، بإرشاد', 'tpl.title': 'ابدأ من سيناريو', 'tpl.use': 'استخدم',
  'admin.title': 'مركز التحكم', 'admin.approve': 'اعتماد', 'admin.reject': 'رفض', 'admin.split': 'فصل سياقي',
  'rel.validate': 'تحقق', 'rel.promote': 'ترقية', 'dna.edit': 'تهيئة التأثيرات',
});

export function LocaleSwitcher() {
  const [locale, set] = useState<Locale>('en');
  const change = (next: Locale) => { setLocale(next); set(next); };
  return (
    <div className="locale-switcher" role="group" aria-label="Language">
      <Globe2 size={12} aria-hidden />
      {(['en', 'fr', 'ar'] as Locale[]).map((code) => (
        <button key={code} type="button" className={locale === code ? 'active' : ''} onClick={() => change(code)}>{code.toUpperCase()}</button>
      ))}
    </div>
  );
}

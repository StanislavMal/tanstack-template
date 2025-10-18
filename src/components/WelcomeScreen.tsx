// 📄 src/components/WelcomeScreen.tsx

import { useTranslation } from 'react-i18next'; // -> ИЗМЕНЕНИЕ

export const WelcomeScreen = () => {
  const { t } = useTranslation(); // -> ИЗМЕНЕНИЕ

  return (
    <div className="w-full max-w-3xl mx-auto text-center px-4">
      <h1 className="mb-4 text-5xl md:text-6xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
        {/* -> ИЗМЕНЕНИЕ */}
        <span className="text-white">AI</span> {t('welcomeTitle').split(' ')[1]} 
      </h1>
      <p className="w-full md:w-2/3 mx-auto mb-6 text-lg text-gray-400">
        {t('welcomeMessage')} {/* -> ИЗМЕНЕНИЕ */}
      </p>
    </div>
  );
}
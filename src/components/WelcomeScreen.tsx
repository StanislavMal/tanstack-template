// 📄 src/components/WelcomeScreen.tsx

export const WelcomeScreen = () => (
  <div className="w-full max-w-3xl mx-auto text-center px-4">
    <h1 className="mb-4 text-5xl md:text-6xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
      <span className="text-white">AI</span> Chat
    </h1>
    <p className="w-full md:w-2/3 mx-auto mb-6 text-lg text-gray-400">
      Вы можете спросить меня о чем угодно, у меня может быть хороший ответ,
       а может и не быть, но вы все равно можете спросить.
    </p>
  </div>
);
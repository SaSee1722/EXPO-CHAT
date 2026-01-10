export const TROLL_MESSAGES = [
    "such a yechaa behaviour bro 😤💦",
    "Curiosity killed the cat, but you're just dying to know 😼",
    "Locked tighter than your secrets! 🤐",
    "Nice try! Swipe up and guess the PIN or keep dreaming 💭",
    "Don't be so desperate to read these juicy gossips! 🍓",
    "PIN please! Or are you a hacker? 🕵️‍♂️",
    "This person clearly doesn't trust you... Oops! 🙊",
    "Stop! PIN time! 🔨",
    "Are you even authorized to be this nosey? 🧐",
    "The gossip behind this lock is too intense for you 🌶️",
    "Blocked by the PIN gods! 🏛️",
];

export const getRandomTrollMessage = () => {
    return TROLL_MESSAGES[Math.floor(Math.random() * TROLL_MESSAGES.length)];
};

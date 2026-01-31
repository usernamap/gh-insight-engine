import OpenAI from 'openai';

const client = new OpenAI({ apiKey: 'sk-test' });
console.log('Client Keys:', Object.keys(client));

// Check beta namespace
if (client.beta) {
    console.log('Client.beta Keys:', Object.keys(client.beta));
    if (client.beta.chat) {
        console.log('Client.beta.chat Keys:', Object.keys(client.beta.chat));
    } else {
        console.log('Client.beta.chat is undefined');
    }
} else {
    console.log('Client.beta is undefined');
}

// Check standard chat namespace for comparison
if (client.chat) {
    console.log('Client.chat Keys:', Object.keys(client.chat));
}

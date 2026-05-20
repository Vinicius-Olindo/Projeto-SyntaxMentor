// =============================================
// Setup para testes do SyntaxMentor
// =============================================

// Mock do chrome.storage
global.chrome = {
    storage: {
        local: {
            get: jest.fn((keys, callback) => {
                callback({});
            }),
            set: jest.fn((data, callback) => {
                if (callback) callback();
            })
        }
    },
    runtime: {
        sendMessage: jest.fn((message, callback) => {
            if (callback) callback({});
        }),
        onMessage: {
            addListener: jest.fn()
        }
    }
};

// Mock do document
global.document = {
    createElement: jest.fn(() => ({
        style: {},
        classList: { add: jest.fn(), remove: jest.fn() },
        appendChild: jest.fn(),
        removeChild: jest.fn()
    })),
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    }
};

// Mock do window
global.window = {
    location: { hostname: 'test.com' },
    addEventListener: jest.fn()
};
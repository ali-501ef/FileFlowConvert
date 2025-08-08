// Test setup for upload integration tests
global.baseURL = 'http://localhost:5000';

// Mock file API for testing
global.File = class File extends Blob {
  constructor(chunks, name, options = {}) {
    super(chunks, options);
    this.name = name;
    this.lastModified = options.lastModified || Date.now();
  }
};

global.DataTransfer = class DataTransfer {
  constructor() {
    this.items = [];
    this.files = [];
  }
};

// Jest expects
expect.extend({
  toBeFile(received, name) {
    const pass = received instanceof File && received.name === name;
    return {
      message: () => `Expected ${received} ${pass ? 'not ' : ''}to be a File named ${name}`,
      pass
    };
  }
});
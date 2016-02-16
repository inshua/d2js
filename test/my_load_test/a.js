print('this is a');
print(__FILE__, __LINE__, __DIR__);
imports('b.js');		// 不能简单的加载同目录的 b，因为 engine.get(FILENAME) 未变
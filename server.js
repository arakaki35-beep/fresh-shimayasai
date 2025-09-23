const express = require('express'); //httpのモジュール？をインポート
const cors = require('cors');
const app = express();

// CORS設定（Vercelからのアクセスを許可）
app.use(cors());

// JSONの解析を有効化
app.use(express.json());

app.get('/',(req,res) => { //リクエストに対してHello Expressのマークアップを返す
    res.send('<h1>Hello Express</h1>');
});

// APIエンドポイント
// 1. ヘルスチェック用

app.get('/api/health', (req, res) => { //リクエストに対してJSONファイルをレスポンスする
    res.json({ //ここからJSONファイルの記述
        status: 'success',
        message: 'API server is runnning!',
        timestamp: new Date().toISOString()
    });
});

// 2. テスト用野菜データ
app.get('/api/vegetables', (req, res) => {
    const testData = [ //ここでテストデータを定義
        {
            id: 1,
            name: 'ゴーヤー',
            price: 150,
            date: '2025-09-23',
            unit: '円/kg'
        },
        {
            id: 2,
            name: '島人参',
            price: 200,
            date: '2025-09-23',
            unit: '円/kg'            
        },
        {
            id: 3,
            name: 'シークワーサー',
            price: 300,
            date: '2025-09-23',
            unit: '円/kg'            
        }
    ];

    res.json({ //テストデータをjsonファイルに変換
        status: 'success',
        data: testData,
        count: testData.length
    });
});

//3. 特定の野菜データ
app.get('/api/vegetables/:name', (req, res) => {
    const vegetableName = req.params.name;

    res.json({
        status: 'success',
        data: {
            name: vegetableName,
            price: 180,
            date: '2025-09-23',
            unit: '円/kg',
            history: [
                { date: '2025-09-21', price: 170 },
                { date: '2025-09-22', price: 175 },
                { date: '2025-09-23', price: 180 }
            ]
        }
    });
});

const port = process.env.PORT || 8080; //Render対応のため固定にしないらしい
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
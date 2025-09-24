require('dotenv').config(); // ←この行を一番上に追加

const express = require('express'); //httpのモジュール？をインポート
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js'); //波カッコは分割代入の意

const app = express();

// Supabase接続設定
const supabaseUrl = process.env.SUPABASE_URL;
const supabasekey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabasekey); // Redis（データベース管理システム）に接続するためのNode.jsのメソッド。

// CORS設定（Vercelからのアクセスを許可）
app.use(cors());

// JSONの解析を有効化
app.use(express.json());

app.get('/',(req,res) => { //リクエストに対してHello Expressのマークアップを返す
    res.send('<h1>Hello Express with Supabase!</h1>');
});

// APIエンドポイント
// 1. ヘルスチェック用

app.get('/api/health', async(req, res) => { //リクエストに対してJSONファイルをレスポンスする
    try{
        // Supabase接続テスト
        const { data, error } = await supabase
            .from('vege_data')
            .select('count')
            .limit(1);

        if(error) throw error;

        res.json({
            status: 'success',
            message: 'API server and Supabase connection OK!',
            timestamp: new Date().toISOString()
        });
    } catch (error){
        res.status(500).json({
            status: 'error',
            message: 'Supabase connection failed',
            error: error.message
        });
    }
});

// 野菜データ取得（最新日付）
app.get('/api/vegetables', async (req, res) => {
    try {
        //最新日付を取得
        const { data: latestDate } = await supabase
            .from('vege_data')
            .select('date')
            .order('date', { ascending: false })
            .limit(1);

        if(!latestDate || latestDate.length === 0){
            return res.json({
                status: 'success',
                data: [],
                message: 'No data found'
            });
        }

        // 最新日付の全野菜データを取得
        const { data, error } = await supabase
            .from('vege_data')
            .select('*')
            .eq('date', latestDate[0].date)
            .order('name');

        if(error) throw error;

        res.json({
            status: 'success',
            data: data,
            count: data.length,
            date: latestDate[0].date
        });
    }catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch vegetables data',
            error: error.message
        });
    }
});

// 特定野菜の価格履歴　※try...catchは例外処理のためのjs構文
app.get('/api/vegetables/:name', async(req, res) => {
    try{
        const vegetableName = req.params.name;

        const { data, error } = await supabase
            .from('vege_data')
            .select('date, price, name')
            .eq('name', vegetableName)
            .order('date', { ascending: false })
            .limit(30);

        if (error) throw error;

        if (data.length === 0){
            return res.json({
                status: 'success',
                data: null,
                message: `No data found for ${vegetableName}`
            });
        }

        res.json({
            status: 'success',
            data: {
                name: vegetableName,
                current_price: data[0].price,
                current_date: data[0].date,
                history: data
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch vegetable history',
            error: error.message
        });
    }
});

const port = process.env.PORT || 8080; //Render対応のため固定にしないらしい
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
});
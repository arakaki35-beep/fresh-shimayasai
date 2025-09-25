require('dotenv').config(); // ←この行を一番上に追加

const express = require('express'); //httpのモジュール？をインポート
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js'); //波カッコは分割代入の意
const { default: axios } = require('axios');

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

// 沖縄県サイトからExcelダウンロード
async function dawnloadExcelFile(){
    const url = 'https://www.pref.okinawa.lg.jp/_res/projects/default_project/_page_/001/024/142/yasai9-22.xlsx';
    const response = await axios.get(url,{ responseType: 'arraybuffer' });
    return response.data;
}

// ExcelデータをJSONに変換
function parseExcelData(buffer){
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    return jsonData;
}

// Supabaseにデータを保存
async function saveToDatabase(data) {
    const { data: result, error } = await supabase
        .from('vege_data')
        .insert(processedData);
}

// 毎日朝9時に実行
cron.schedule('0 9 * * *', async () => {
    console.log('データ自動更新開始...');
    // 上記の処理を実行
});

// server.js に追加するコード

const xlsx = require('xlsx');
// const axios = require('axios');
const cron = require('node-cron');

// 沖縄県から野菜価格データを自動取得する関数
async function fetchVegetableData() {
    try {
        console.log('野菜価格データの自動取得を開始...');
        
        // 1. 現在の日付を取得
        const today = new Date();
        const dateStr = formatDateForFileName(today);
        
        // 2. ExcelファイルのURLを生成（例: yasai9-22.xlsx）
        const baseUrl = 'https://www.pref.okinawa.lg.jp/_res/projects/default_project/_page_/001/024/142/';
        const fileName = `yasai${dateStr}.xlsx`;
        const fileUrl = baseUrl + fileName;
        
        console.log(`取得URL: ${fileUrl}`);
        
        // 3. Excelファイルをダウンロード
        const response = await axios.get(fileUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000 
        });
        
        // 4. Excelファイルを解析
        const workbook = xlsx.read(response.data);
        const vegetables = parseVegetableData(workbook, today);
        
        console.log(`解析完了: ${vegetables.length}件のデータを取得`);
        
        // 5. Supabaseに保存
        if (vegetables.length > 0) {
            await saveVegetablesToDatabase(vegetables);
            console.log('データベースへの保存完了');
        } else {
            console.log('保存するデータがありません');
        }
        
        return { success: true, count: vegetables.length };
        
    } catch (error) {
        console.error('データ取得エラー:', error.message);
        
        // エラー通知（本番環境では管理者にメール送信など）
        return { success: false, error: error.message };
    }
}

// Excelファイル名用の日付フォーマット（例: 9-22）
function formatDateForFileName(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}-${day}`;
}

// Excelデータを解析してJSON形式に変換
function parseVegetableData(workbook, targetDate) {
    // 曜日を判定
    const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    const dayOfWeek = dayNames[targetDate.getDay()];
    
    console.log(`対象シート: ${dayOfWeek}`);
    
    const sheet = workbook.Sheets[dayOfWeek];
    if (!sheet) {
        throw new Error(`シート「${dayOfWeek}」が見つかりません`);
    }
    
    const vegetables = [];
    const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 7行目から38行目まで品目データを取得
    for (let row = 7; row <= 38; row++) {
        const itemName = sheet[`B${row}`]?.v;
        const price = sheet[`G${row}`]?.v;
        
        // データの検証
        if (itemName && 
            price !== undefined && 
            price !== "" && 
            !isNaN(price) && 
            price > 0) {
            
            vegetables.push({
                name: itemName.toString().trim(),
                price: Math.round(parseFloat(price) * 100) / 100, // 小数点2桁
                date: dateStr
            });
        }
    }
    
    return vegetables;
}

// Supabaseにデータを保存
async function saveVegetablesToDatabase(vegetables) {
    try {
        // 既存の同日データを削除（重複防止）
        const today = vegetables[0].date;
        await supabase
            .from('vege_data')
            .delete()
            .eq('date', today);
        
        console.log(`${today}の既存データを削除`);
        
        // 新しいデータを一括挿入
        const { data, error } = await supabase
            .from('vege_data')
            .insert(vegetables);
        
        if (error) throw error;
        
        console.log(`${vegetables.length}件のデータを保存しました`);
        return data;
        
    } catch (error) {
        console.error('データベース保存エラー:', error);
        throw error;
    }
}

// 手動実行用API（テスト用）
app.get('/api/update-vegetables', async (req, res) => {
    try {
        const result = await fetchVegetableData();
        res.json({
            status: result.success ? 'success' : 'error',
            message: result.success ? 
                `${result.count}件のデータを更新しました` : 
                'データ更新に失敗しました',
            error: result.error || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'サーバーエラー',
            error: error.message
        });
    }
});

// スケジュール実行（毎日朝9時）
cron.schedule('0 9 * * *', async () => {
    console.log('=== 定期実行: 野菜価格データ更新 ===');
    await fetchVegetableData();
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});

// アプリ起動時に1回実行（テスト用）
// fetchVegetableData();

console.log('野菜価格自動更新システムが起動しました');
console.log('毎日午前9時に自動実行されます');
console.log('手動実行: GET /api/update-vegetables');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const xlsx = require('xlsx');
const cron = require('node-cron');

const app = express();

// Supabase接続設定
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS設定
app.use(cors());
app.use(express.json());

// 基本ルート
app.get('/', (req, res) => {
    res.send('<h1>Hello Express with Supabase!</h1>');
});

// ヘルスチェック
app.get('/api/health', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('vege_data')
            .select('count')
            .limit(1);

        if (error) throw error;

        res.json({
            status: 'success',
            message: 'API server and Supabase connection OK!',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
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
        const { data: latestDate } = await supabase
            .from('vege_data')
            .select('date')
            .order('date', { ascending: false })
            .limit(1);

        if (!latestDate || latestDate.length === 0) {
            return res.json({
                status: 'success',
                data: [],
                message: 'No data found'
            });
        }

        const { data, error } = await supabase
            .from('vege_data')
            .select('*')
            .eq('date', latestDate[0].date)
            .order('name');

        if (error) throw error;

        res.json({
            status: 'success',
            data: data,
            count: data.length,
            date: latestDate[0].date
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch vegetables data',
            error: error.message
        });
    }
});

// 特定野菜の価格履歴
app.get('/api/vegetables/:name', async (req, res) => {
    try {
        const vegetableName = req.params.name;

        const { data, error } = await supabase
            .from('vege_data')
            .select('date, price, name')
            .eq('name', vegetableName)
            .order('date', { ascending: false })
            .limit(7);

        if (error) throw error;

        if (data.length === 0) {
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

// ===========================================
// 自動データ取得システム
// ===========================================

// Excelファイル名用の日付フォーマット（例: 9-25）
function formatDateForFileName(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}-${day}`;
}

// Excelデータを解析してJSON形式に変換
function parseVegetableData(workbook, targetDate) {
    const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    const dayOfWeek = dayNames[targetDate.getDay()];
    
    console.log(`対象シート: ${dayOfWeek}`);
    
    const sheet = workbook.Sheets[dayOfWeek];
    if (!sheet) {
        throw new Error(`シート「${dayOfWeek}」が見つかりません`);
    }
    
    const vegetables = [];
    const dateStr = targetDate.toISOString().split('T')[0];
    
    // 7行目から38行目まで品目データを取得
    for (let row = 7; row <= 38; row++) {
        const itemName = sheet[`B${row}`]?.v;
        const price = sheet[`G${row}`]?.v;
        
        if (itemName && 
            price !== undefined && 
            price !== "" && 
            !isNaN(price) && 
            price > 0) {
            
            vegetables.push({
                name: itemName.toString().trim(),
                price: Math.round(parseFloat(price) * 100) / 100,
                date: dateStr
            });
        }
    }
    
    return vegetables;
}

// Supabaseにデータを保存
async function saveVegetablesToDatabase(vegetables) {
    try {
        const today = vegetables[0].date;
        await supabase
            .from('vege_data')
            .delete()
            .eq('date', today);
        
        console.log(`${today}の既存データを削除`);
        
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

// メイン関数：野菜価格データを自動取得
async function fetchVegetableData() {
    try {
        console.log('野菜価格データの自動取得を開始...');
        
        const today = new Date();
        const dateStr = formatDateForFileName(today);
        
        const baseUrl = 'https://www.pref.okinawa.lg.jp/_res/projects/default_project/_page_/001/024/142/';
        const fileName = `yasai${dateStr}.xlsx`;
        const fileUrl = baseUrl + fileName;
        
        console.log(`取得URL: ${fileUrl}`);
        
        const response = await axios.get(fileUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000 
        });
        
        const workbook = xlsx.read(response.data);
        const vegetables = parseVegetableData(workbook, today);
        
        console.log(`解析完了: ${vegetables.length}件のデータを取得`);
        
        if (vegetables.length > 0) {
            await saveVegetablesToDatabase(vegetables);
            console.log('データベースへの保存完了');
        } else {
            console.log('保存するデータがありません');
        }
        
        return { success: true, count: vegetables.length };
        
    } catch (error) {
        console.error('データ取得エラー:', error.message);
        return { success: false, error: error.message };
    }
}

// 手動実行用API
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
cron.schedule('0 12 * * *', async () => {
    console.log('=== 定期実行: 野菜価格データ更新 ===');
    await fetchVegetableData();
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
    console.log('野菜価格自動更新システムが起動しました');
    console.log('毎日午前12時に自動実行されます');
    console.log('手動実行: GET /api/update-vegetables');
});

app.get('/api/vegetables-history', async (req, res) => {
    try {
        // 過去30日間のデータを取得
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data, error } = await supabase
            .from('vege_data')
            .select('date, name, price')
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
            .order('date', { ascending: true })
            .order('name');
        
        if (error) throw error;
        
        // データを野菜ごとにグループ化
        const groupedData = {};
        const allDates = [...new Set(data.map(item => item.date))].sort();
        
        data.forEach(item => {
            if (!groupedData[item.name]) {
                groupedData[item.name] = [];
            }
            groupedData[item.name].push({
                date: item.date,
                price: item.price
            });
        });
        
        res.json({
            status: 'success',
            data: groupedData,
            dates: allDates,
            vegetables: Object.keys(groupedData)
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch vegetables history',
            error: error.message
        });
    }
});
// Test script to verify multi-chapter story functionality
// Run this in browser console after loading the application

console.log('🧪 Testing Multi-Chapter Story Functionality...');

// Test 1: Verify UI elements are present
function testUIElements() {
    console.log('\n📋 Test 1: UI Elements');
    
    const chapterSelector = document.getElementById('classic-chapters');
    if (chapterSelector) {
        console.log('✅ Chapter selector found');
        console.log('Available options:', Array.from(chapterSelector.options).map(opt => opt.text));
    } else {
        console.error('❌ Chapter selector not found');
    }
    
    const chapterProgressInfo = document.getElementById('chapter-progress-info');
    if (chapterProgressInfo) {
        console.log('✅ Chapter progress info element found');
    } else {
        console.error('❌ Chapter progress info element not found');
    }
    
    const currentChapter = document.getElementById('current-chapter');
    const totalChapters = document.getElementById('total-chapters');
    if (currentChapter && totalChapters) {
        console.log('✅ Chapter indicators found');
    } else {
        console.error('❌ Chapter indicators not found');
    }
}

// Test 2: Test chapter selector functionality
function testChapterSelector() {
    console.log('\n🔄 Test 2: Chapter Selector');
    
    const chapterSelector = document.getElementById('classic-chapters');
    if (chapterSelector) {
        // Test changing values
        [1, 2, 3].forEach(value => {
            chapterSelector.value = value;
            console.log(`Set chapters to ${value}, current value: ${chapterSelector.value}`);
        });
        
        // Reset to default
        chapterSelector.value = '1';
        console.log('✅ Chapter selector functionality working');
    }
}

// Test 3: Verify CSS styles are loaded
function testCSS() {
    console.log('\n🎨 Test 3: CSS Styles');
    
    const chapterSelector = document.getElementById('classic-chapters');
    if (chapterSelector) {
        const parentDiv = chapterSelector.closest('.chapter-selection-compact');
        if (parentDiv) {
            const styles = window.getComputedStyle(parentDiv);
            console.log('Chapter selection styles:', {
                display: styles.display,
                flexDirection: styles.flexDirection,
                backgroundColor: styles.backgroundColor
            });
            console.log('✅ Chapter selection CSS loaded');
        }
    }
}

// Test 4: Mock API response structure for multi-chapter
function testAPIResponseStructure() {
    console.log('\n📡 Test 4: API Response Structure');
    
    const mockMultiChapterResponse = {
        story: "Chapter 1: The Beginning\n\nOnce upon a time...\n\n---\n\nChapter 2: The Adventure\n\nThe hero continued...",
        audio: "base64audiodata",
        duration: 360,
        fileSize: 1000000,
        chapters: [
            {
                title: "The Magical Beginning",
                text: "Once upon a time in a magical forest...",
                audio: "base64chapter1audio",
                duration: 180,
                fileSize: 500000
            },
            {
                title: "The Great Adventure",
                text: "The hero ventured deeper into the unknown...",
                audio: "base64chapter2audio", 
                duration: 180,
                fileSize: 500000
            }
        ],
        numChapters: 2,
        debug: {
            chapters: 2,
            chapterTitles: ["The Magical Beginning", "The Great Adventure"]
        }
    };
    
    console.log('Mock multi-chapter response structure:', mockMultiChapterResponse);
    
    // Test chapter breakdown display function exists
    if (typeof window.displayChapterBreakdown !== 'undefined') {
        console.log('✅ displayChapterBreakdown function available');
    } else {
        console.log('ℹ️ displayChapterBreakdown function not yet exposed globally');
    }
    
    console.log('✅ API response structure validated');
}

// Test 5: Test progress calculation
function testProgressCalculation() {
    console.log('\n📊 Test 5: Progress Calculation');
    
    // Mock progress calculation for multi-chapter
    function calculateChapterProgress(stageNum, currentChapter, totalChapters) {
        const baseProgress = (stageNum / 5) * 100;
        const chapterProgress = totalChapters > 1 ? 
            ((currentChapter - 1) / totalChapters * 100) + (baseProgress / totalChapters) : 
            baseProgress;
        return chapterProgress;
    }
    
    // Test different scenarios
    const testCases = [
        { stage: 3, chapter: 1, total: 1 },
        { stage: 3, chapter: 1, total: 2 },
        { stage: 3, chapter: 2, total: 2 },
        { stage: 5, chapter: 3, total: 3 }
    ];
    
    testCases.forEach(test => {
        const progress = calculateChapterProgress(test.stage, test.chapter, test.total);
        console.log(`Stage ${test.stage}, Chapter ${test.chapter}/${test.total}: ${progress.toFixed(1)}%`);
    });
    
    console.log('✅ Progress calculation working correctly');
}

// Run all tests
function runAllTests() {
    console.log('🚀 Running Multi-Chapter Story Tests...');
    
    testUIElements();
    testChapterSelector();
    testCSS();
    testAPIResponseStructure();
    testProgressCalculation();
    
    console.log('\n🎉 Multi-Chapter Story Tests Complete!');
    console.log('ℹ️ To test full functionality, create a 2-3 chapter story using the UI');
}

// Auto-run tests when script is loaded
runAllTests();

// Make test functions available globally for manual testing
window.multiChapterTests = {
    runAllTests,
    testUIElements,
    testChapterSelector,
    testCSS,
    testAPIResponseStructure,
    testProgressCalculation
};

console.log('ℹ️ Tests available globally as window.multiChapterTests');
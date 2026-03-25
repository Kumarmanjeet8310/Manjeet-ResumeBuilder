const STORAGE_KEY = 'careercraft_draft_v1';

const TEMPLATE_MAP = {
    resume: [
        { value: 'resume-elegant', label: 'Resume Elegant' },
        { value: 'resume-corporate', label: 'Resume Corporate' },
        { value: 'resume-minimal', label: 'Resume Minimal' },
        { value: 'resume-bold', label: 'Resume Bold' }
    ],
    biodata: [
        { value: 'biodata-classic', label: 'Biodata Classic' },
        { value: 'biodata-royal', label: 'Biodata Royal' },
        { value: 'biodata-modern', label: 'Biodata Modern' }
    ]
};

const LIST_CONFIG = {
    experience: {
        containerId: 'experienceList',
        fields: ['role', 'company', 'start', 'end', 'description'],
        title: 'Experience'
    },
    education: {
        containerId: 'educationList',
        fields: ['degree', 'school', 'start', 'end', 'score'],
        title: 'Education'
    },
    project: {
        containerId: 'projectList',
        fields: ['title', 'link', 'description'],
        title: 'Project'
    }
};

let saveTimer = null;
let state = createDefaultState(readModeFromUrl() || 'resume');

const modeSelect = document.getElementById('modeSelect');
const templateSelect = document.getElementById('templateSelect');
const resumeFields = document.getElementById('resumeFields');
const biodataFields = document.getElementById('biodataFields');
const previewPaper = document.getElementById('previewPaper');

init();

function init() {
    loadDraftFromStorage();

    modeSelect.value = state.mode;
    updateTemplateOptions();
    populateFormFromState();
    updateModeVisibility();
    renderPreview();

    document.querySelector('.editor-panel').addEventListener('input', () => {
        syncStateFromForm();
        renderPreview();
        scheduleSave();
    });

    document.querySelector('.editor-panel').addEventListener('change', () => {
        syncStateFromForm();
        renderPreview();
        scheduleSave();
    });

    modeSelect.addEventListener('change', () => {
        state.mode = modeSelect.value;
        updateTemplateOptions();
        updateModeVisibility();
        renderPreview();
        scheduleSave();
    });

    templateSelect.addEventListener('change', () => {
        state.template = templateSelect.value;
        renderPreview();
        scheduleSave();
    });

    document.getElementById('addExperienceBtn').addEventListener('click', () => addListRow('experience'));
    document.getElementById('addEducationBtn').addEventListener('click', () => addListRow('education'));
    document.getElementById('addProjectBtn').addEventListener('click', () => addListRow('project'));

    document.getElementById('saveDraftBtn').addEventListener('click', () => {
        syncStateFromForm();
        saveDraft();
        showToast('Draft saved');
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        if (!window.confirm('Reset all form fields for this document type?')) {
            return;
        }
        const preservedMode = state.mode;
        state = createDefaultState(preservedMode);
        modeSelect.value = state.mode;
        updateTemplateOptions();
        populateFormFromState();
        updateModeVisibility();
        renderPreview();
        saveDraft();
        showToast('Form reset');
    });

    document.getElementById('downloadBtn').addEventListener('click', downloadPdf);
}

function createDefaultState(mode) {
    const selectedMode = mode === 'biodata' ? 'biodata' : 'resume';
    return {
        mode: selectedMode,
        template: selectedMode === 'resume' ? 'resume-elegant' : 'biodata-classic',
        profile: {
            fullName: '',
            headline: '',
            email: '',
            phone: '',
            location: '',
            photoUrl: ''
        },
        resume: {
            summary: '',
            skills: '',
            experience: [],
            education: [],
            project: []
        },
        biodata: {
            about: '',
            personal: {
                dob: '',
                age: '',
                height: '',
                weight: '',
                religion: '',
                caste: '',
                motherTongue: '',
                maritalStatus: '',
                occupation: '',
                income: ''
            },
            family: {
                fatherName: '',
                motherName: '',
                brothers: '',
                sisters: '',
                familyType: '',
                familyLocation: ''
            },
            lifestyle: {
                diet: '',
                smoking: '',
                drinking: '',
                hobbies: ''
            },
            partnerPreference: ''
        }
    };
}

function readModeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    return mode === 'resume' || mode === 'biodata' ? mode : null;
}

function loadDraftFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        const fallback = createDefaultState(state.mode);
        const merged = {
            ...fallback,
            ...parsed,
            profile: { ...fallback.profile, ...(parsed.profile || {}) },
            resume: {
                ...fallback.resume,
                ...(parsed.resume || {}),
                experience: Array.isArray(parsed?.resume?.experience) ? parsed.resume.experience : [],
                education: Array.isArray(parsed?.resume?.education) ? parsed.resume.education : [],
                project: Array.isArray(parsed?.resume?.project) ? parsed.resume.project : []
            },
            biodata: {
                ...fallback.biodata,
                ...(parsed.biodata || {}),
                personal: { ...fallback.biodata.personal, ...(parsed?.biodata?.personal || {}) },
                family: { ...fallback.biodata.family, ...(parsed?.biodata?.family || {}) },
                lifestyle: { ...fallback.biodata.lifestyle, ...(parsed?.biodata?.lifestyle || {}) }
            }
        };

        if (merged.mode !== 'resume' && merged.mode !== 'biodata') {
            merged.mode = fallback.mode;
        }

        const modeFromUrl = readModeFromUrl();
        if (modeFromUrl) {
            merged.mode = modeFromUrl;
        }

        state = merged;
    } catch (error) {
        console.error('Failed to load draft:', error);
    }
}

function updateTemplateOptions() {
    const options = TEMPLATE_MAP[state.mode];
    templateSelect.innerHTML = options
        .map((option) => `<option value="${option.value}">${option.label}</option>`)
        .join('');

    if (!options.some((option) => option.value === state.template)) {
        state.template = options[0].value;
    }

    templateSelect.value = state.template;
}

function updateModeVisibility() {
    const showResume = state.mode === 'resume';
    resumeFields.style.display = showResume ? 'grid' : 'none';
    biodataFields.style.display = showResume ? 'none' : 'grid';
}

function populateFormFromState() {
    setValue('fullName', state.profile.fullName);
    setValue('headline', state.profile.headline);
    setValue('email', state.profile.email);
    setValue('phone', state.profile.phone);
    setValue('location', state.profile.location);
    setValue('photoUrl', state.profile.photoUrl);

    setValue('summary', state.resume.summary);
    setValue('skills', state.resume.skills);

    setValue('biodataAbout', state.biodata.about);
    setValue('dob', state.biodata.personal.dob);
    setValue('age', state.biodata.personal.age);
    setValue('height', state.biodata.personal.height);
    setValue('weight', state.biodata.personal.weight);
    setValue('religion', state.biodata.personal.religion);
    setValue('caste', state.biodata.personal.caste);
    setValue('motherTongue', state.biodata.personal.motherTongue);
    setValue('maritalStatus', state.biodata.personal.maritalStatus);
    setValue('occupation', state.biodata.personal.occupation);
    setValue('income', state.biodata.personal.income);

    setValue('fatherName', state.biodata.family.fatherName);
    setValue('motherName', state.biodata.family.motherName);
    setValue('brothers', state.biodata.family.brothers);
    setValue('sisters', state.biodata.family.sisters);
    setValue('familyType', state.biodata.family.familyType);
    setValue('familyLocation', state.biodata.family.familyLocation);

    setValue('diet', state.biodata.lifestyle.diet);
    setValue('smoking', state.biodata.lifestyle.smoking);
    setValue('drinking', state.biodata.lifestyle.drinking);
    setValue('hobbies', state.biodata.lifestyle.hobbies);

    setValue('partnerPreference', state.biodata.partnerPreference);

    renderList('experience', state.resume.experience);
    renderList('education', state.resume.education);
    renderList('project', state.resume.project);
}

function setValue(id, value) {
    const node = document.getElementById(id);
    if (node) {
        node.value = value || '';
    }
}

function renderList(listType, values) {
    const config = LIST_CONFIG[listType];
    const container = document.getElementById(config.containerId);
    container.innerHTML = '';

    const items = Array.isArray(values) && values.length > 0 ? values : [{}];
    items.forEach((item, index) => {
        container.appendChild(buildListRow(listType, item, index + 1));
    });
}

function addListRow(listType) {
    const config = LIST_CONFIG[listType];
    const container = document.getElementById(config.containerId);
    container.appendChild(buildListRow(listType, {}, container.children.length + 1));
    syncStateFromForm();
    renderPreview();
    scheduleSave();
}

function buildListRow(listType, value, displayIndex) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.listType = listType;

    const config = LIST_CONFIG[listType];
    const fieldsHtml = config.fields
        .map((field) => {
            const label = field.charAt(0).toUpperCase() + field.slice(1);
            const inputType = field === 'description' ? 'textarea' : 'input';
            const safeValue = escapeHtml(value[field] || '');
            if (inputType === 'textarea') {
                return `<label><span>${label}</span><textarea data-field="${field}" rows="2" placeholder="${label}">${safeValue}</textarea></label>`;
            }
            return `<label><span>${label}</span><input data-field="${field}" type="text" placeholder="${label}" value="${safeValue}"></label>`;
        })
        .join('');

    row.innerHTML = `
        <div class="item-head">
            <span class="item-title">${config.title} ${displayIndex}</span>
            <button type="button" class="icon-btn" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="grid-2">${fieldsHtml}</div>
    `;

    row.querySelector('.icon-btn').addEventListener('click', () => {
        const parent = row.parentElement;
        row.remove();
        if (parent.children.length === 0) {
            parent.appendChild(buildListRow(listType, {}, 1));
        }
        refreshListIndexes(parent, listType);
        syncStateFromForm();
        renderPreview();
        scheduleSave();
    });

    return row;
}

function refreshListIndexes(container, listType) {
    container.querySelectorAll('.item-row').forEach((row, index) => {
        const title = row.querySelector('.item-title');
        if (title) {
            title.textContent = `${LIST_CONFIG[listType].title} ${index + 1}`;
        }
    });
}

function collectListValues(listType) {
    const config = LIST_CONFIG[listType];
    const container = document.getElementById(config.containerId);
    const rows = Array.from(container.querySelectorAll('.item-row'));

    return rows
        .map((row) => {
            const item = {};
            config.fields.forEach((field) => {
                const node = row.querySelector(`[data-field="${field}"]`);
                item[field] = node ? node.value.trim() : '';
            });
            return item;
        })
        .filter((item) => Object.values(item).some((value) => Boolean(value)));
}

function syncStateFromForm() {
    state.profile.fullName = getValue('fullName');
    state.profile.headline = getValue('headline');
    state.profile.email = getValue('email');
    state.profile.phone = getValue('phone');
    state.profile.location = getValue('location');
    state.profile.photoUrl = getValue('photoUrl');

    state.resume.summary = getValue('summary');
    state.resume.skills = getValue('skills');
    state.resume.experience = collectListValues('experience');
    state.resume.education = collectListValues('education');
    state.resume.project = collectListValues('project');

    state.biodata.about = getValue('biodataAbout');
    state.biodata.personal.dob = getValue('dob');
    state.biodata.personal.age = getValue('age');
    state.biodata.personal.height = getValue('height');
    state.biodata.personal.weight = getValue('weight');
    state.biodata.personal.religion = getValue('religion');
    state.biodata.personal.caste = getValue('caste');
    state.biodata.personal.motherTongue = getValue('motherTongue');
    state.biodata.personal.maritalStatus = getValue('maritalStatus');
    state.biodata.personal.occupation = getValue('occupation');
    state.biodata.personal.income = getValue('income');

    state.biodata.family.fatherName = getValue('fatherName');
    state.biodata.family.motherName = getValue('motherName');
    state.biodata.family.brothers = getValue('brothers');
    state.biodata.family.sisters = getValue('sisters');
    state.biodata.family.familyType = getValue('familyType');
    state.biodata.family.familyLocation = getValue('familyLocation');

    state.biodata.lifestyle.diet = getValue('diet');
    state.biodata.lifestyle.smoking = getValue('smoking');
    state.biodata.lifestyle.drinking = getValue('drinking');
    state.biodata.lifestyle.hobbies = getValue('hobbies');

    state.biodata.partnerPreference = getValue('partnerPreference');

    state.mode = modeSelect.value;
    state.template = templateSelect.value;
}

function getValue(id) {
    const node = document.getElementById(id);
    return node ? node.value.trim() : '';
}

function renderPreview() {
    syncStateFromForm();
    previewPaper.className = `preview-paper ${state.template}`;
    previewPaper.innerHTML = state.mode === 'resume' ? renderResumeHtml() : renderBiodataHtml();
}

function renderResumeHtml() {
    const name = escapeHtml(state.profile.fullName || 'Your Name');
    const headline = escapeHtml(state.profile.headline || 'Professional Title');
    const contact = [state.profile.email, state.profile.phone, state.profile.location]
        .map((part) => escapeHtml(part))
        .filter(Boolean)
        .join(' | ');

    let html = `
        <header class="paper-header">
            <div class="paper-name">${name}</div>
            <div class="paper-headline">${headline}</div>
            ${contact ? `<div class="paper-contact">${contact}</div>` : ''}
        </header>
    `;

    if (state.resume.summary) {
        html += `
            <section class="paper-section">
                <h3>Summary</h3>
                <p>${escapeHtml(state.resume.summary)}</p>
            </section>
        `;
    }

    if (state.resume.skills) {
        const pills = state.resume.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean)
            .map((skill) => `<span class="skill-pill">${escapeHtml(skill)}</span>`)
            .join('');

        html += `
            <section class="paper-section">
                <h3>Skills</h3>
                <div class="skill-cloud">${pills}</div>
            </section>
        `;
    }

    if (state.resume.experience.length) {
        const items = state.resume.experience
            .map((item) => {
                const companyLine = [item.company, item.start, item.end].filter(Boolean).join(' | ');
                return `
                    <article class="paper-item">
                        <div class="paper-item-head">
                            <span>${escapeHtml(item.role || '')}</span>
                            <span>${escapeHtml(companyLine)}</span>
                        </div>
                        ${item.description ? `<div class="paper-sub">${escapeHtml(item.description)}</div>` : ''}
                    </article>
                `;
            })
            .join('');

        html += `<section class="paper-section"><h3>Experience</h3>${items}</section>`;
    }

    if (state.resume.education.length) {
        const items = state.resume.education
            .map((item) => {
                const schoolLine = [item.school, item.start, item.end].filter(Boolean).join(' | ');
                return `
                    <article class="paper-item">
                        <div class="paper-item-head">
                            <span>${escapeHtml(item.degree || '')}</span>
                            <span>${escapeHtml(item.score || '')}</span>
                        </div>
                        ${schoolLine ? `<div class="paper-sub">${escapeHtml(schoolLine)}</div>` : ''}
                    </article>
                `;
            })
            .join('');

        html += `<section class="paper-section"><h3>Education</h3>${items}</section>`;
    }

    if (state.resume.project.length) {
        const items = state.resume.project
            .map((item) => {
                return `
                    <article class="paper-item">
                        <div class="paper-item-head">
                            <span>${escapeHtml(item.title || '')}</span>
                            <span>${escapeHtml(item.link || '')}</span>
                        </div>
                        ${item.description ? `<div class="paper-sub">${escapeHtml(item.description)}</div>` : ''}
                    </article>
                `;
            })
            .join('');

        html += `<section class="paper-section"><h3>Projects</h3>${items}</section>`;
    }

    return html;
}

function renderBiodataHtml() {
    const name = escapeHtml(state.profile.fullName || 'Your Name');
    const headline = escapeHtml(state.profile.headline || 'Marriage Biodata');
    const photo = state.profile.photoUrl
        ? `<img class="biodata-photo" src="${escapeHtml(state.profile.photoUrl)}" alt="Profile">`
        : '';

    let html = `
        <header class="paper-header">
            <div class="biodata-top">
                <div>
                    <div class="paper-name">${name}</div>
                    <div class="paper-headline">${headline}</div>
                    <div class="paper-contact">${escapeHtml(state.profile.phone)} ${state.profile.email ? `| ${escapeHtml(state.profile.email)}` : ''}</div>
                </div>
                ${photo}
            </div>
        </header>
    `;

    if (state.biodata.about) {
        html += `
            <section class="paper-section">
                <h3>Introduction</h3>
                <p>${escapeHtml(state.biodata.about)}</p>
            </section>
        `;
    }

    html += `
        <section class="paper-section">
            <h3>Personal Details</h3>
            <table class="detail-table">
                ${detailRow('Date of Birth', state.biodata.personal.dob)}
                ${detailRow('Age', state.biodata.personal.age)}
                ${detailRow('Height', state.biodata.personal.height)}
                ${detailRow('Weight', state.biodata.personal.weight)}
                ${detailRow('Religion', state.biodata.personal.religion)}
                ${detailRow('Caste / Community', state.biodata.personal.caste)}
                ${detailRow('Mother Tongue', state.biodata.personal.motherTongue)}
                ${detailRow('Marital Status', state.biodata.personal.maritalStatus)}
                ${detailRow('Occupation', state.biodata.personal.occupation)}
                ${detailRow('Annual Income', state.biodata.personal.income)}
                ${detailRow('Location', state.profile.location)}
            </table>
        </section>

        <section class="paper-section">
            <h3>Family Details</h3>
            <table class="detail-table">
                ${detailRow("Father's Name", state.biodata.family.fatherName)}
                ${detailRow("Mother's Name", state.biodata.family.motherName)}
                ${detailRow('Brothers', state.biodata.family.brothers)}
                ${detailRow('Sisters', state.biodata.family.sisters)}
                ${detailRow('Family Type', state.biodata.family.familyType)}
                ${detailRow('Family Location', state.biodata.family.familyLocation)}
            </table>
        </section>

        <section class="paper-section">
            <h3>Lifestyle</h3>
            <table class="detail-table">
                ${detailRow('Diet', state.biodata.lifestyle.diet)}
                ${detailRow('Smoking', state.biodata.lifestyle.smoking)}
                ${detailRow('Drinking', state.biodata.lifestyle.drinking)}
                ${detailRow('Hobbies', state.biodata.lifestyle.hobbies)}
            </table>
        </section>
    `;

    if (state.biodata.partnerPreference) {
        html += `
            <section class="paper-section">
                <h3>Partner Preferences</h3>
                <p>${escapeHtml(state.biodata.partnerPreference)}</p>
            </section>
        `;
    }

    return html;
}

function detailRow(label, value) {
    if (!value) {
        return '';
    }
    return `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveDraft(), 350);
}

function downloadPdf() {
    syncStateFromForm();
    renderPreview();

    const baseName = state.profile.fullName ? state.profile.fullName.replace(/\s+/g, '_') : 'document';
    const suffix = state.mode === 'resume' ? 'resume' : 'biodata';
    const fileName = `${baseName}_${suffix}.pdf`;

    if (window.html2pdf) {
        window.html2pdf()
            .set({
                margin: 8,
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            })
            .from(previewPaper)
            .save();
        showToast('PDF download started');
        return;
    }

    window.print();
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

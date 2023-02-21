// название задачи
const taskName = 'Контакт без сделок';

// API хост
const hostAddr = 'https://farkhad.amocrm.ru';

// адрес API для пакетного создания задач
const tasksCreateUrl = '/api/v4/tasks';

// кол-во возвращаемых записей контактов
const limit = 25;

// номер страницы с контактами
let page = 1;

// адрес API для работы с контактами
let getContactsListQueryUrl = '/api/v4/contacts?order[id]=asc';

// Адрес API задач для поиска задач, связанных с контактами 
let tasksContactsQueryUrl = '/api/v4/tasks?filter[task_type]=1&filter[is_completed]=0&filter[entity_type]=contacts';

//ключевые функций для AJAX-запросов
let ajaxCrossDomainCallers = {
  // Получение списка контактов для данных page & limit
  getContacts: {
    url: getContactsListQueryUrl,
    method: 'GET',
    
    // callback обработки данных при успешном запросе
    done: getContactsDone,

    // callback обработки ошибки при запросе
    fail: getContactsFail
  },

  // Обработка полученного списка контактов с данных page & limit
  // Проверка существующих связанных задач для контактов без сделок
  parseContacts: {
    url: tasksContactsQueryUrl,
    method: 'GET',
    done: parseContactsDone,
    fail: parseContactsFail
  },

  // Пакетное создание задач связанных с контактами без сделок
  createTasksWithContacts: {
    url: tasksCreateUrl,
    method: 'POST',
    done: createTasksWithContactsDone,
    fail: createTasksWithContactsFail
  }
};

// Получение списка контактов без сделок 
function getContacts() {
  ajaxCrossDomainCall('getContacts', {
    limit: limit,
    page: page,
    with: 'leads'
  });

  page++;
}

// Обработка поступивших данных о контактах в функции getContacts
function getContactsDone(data) {
  if (!!data) {
    // - создание задач для контактов без сделок
    parseContacts(data._embedded.contacts);

    //поиск контактов на другой странице
    getContacts();
  } else {
    console.log('Контактов нет');
    return false;
  }
}
// Обработка массива контактов
// 1 Определяем массив контактов без сделок
// 2 Проверяем, есть ли связанные задачи с указанным taskName
// 3 Создаем задачи для отобранных контактов
function parseContacts(contacts) {
  // массив ID контаков без сделок
  let contactsWithoutLeads = getContactsWithoutLeads(contacts);

  // проверяем нашлись ли контакты без сделок
  if (!contactsWithoutLeads.length) {
    return false;
  }

  // проверяем, есть ли у найденных контактов связанные задачи
  ajaxCrossDomainCall('parseContacts', {
    'filter[entity_id]': contactsWithoutLeads
  });
}

// Обработка поступивших данных о связанных задачах (если такие были найдены)
function parseContactsDone(data, contactsWithoutLeads) {
  if (!!data) {
    // нашли связанные с массивом контактов существующие задачи
    data._embedded.tasks.forEach(task => {
      if (task.text === taskName) {
        // Удаляем ID контакта из массива контактов, 
        // чтобы не создавать задачу для него
        let contactIdx = contactsWithoutLeads.indexOf(task.entity_id);
        if (contactIdx > -1) {
          // удаляем найденный элемент из массива контактов
          contactsWithoutLeads.splice(contactIdx, 1);
        }
      }
    });
  }
  // создаем задачи для отобранных контактов
  createTasksWithContacts(contactsWithoutLeads);
}
